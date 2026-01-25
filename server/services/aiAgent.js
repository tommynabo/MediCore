
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Lazy Init to prevent crash if Key is missing on startup
let openai;
function getOpenAI() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

// Supabase client helper
function getSupabase() {
    const URL = process.env.SUPABASE_URL || "https://gnnacijqglcqonholpwt.supabase.co";
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFjaWpxZ2xjcW9uaG9scHd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ3NjU0NCwiZXhwIjoyMDg0MDUyNTQ0fQ.6qexkezsBpOhvTch_eRsr8lF_mixdp9sfv0ScjUmxp4";
    return createClient(URL, KEY);
}

async function processQuery(userQuery, userInfo = {}, extraContext = {}) {
    try {
        const supabase = getSupabase();
        const userRole = userInfo.role || 'DOCTOR';
        const userId = userInfo.id || null;
        const doctorId = userInfo.doctorId || null;

        console.log("AI DEBUG: Processing query with role:", userRole);

        const isVIP = userRole === 'ADMIN';
        const isDoctor = userRole === 'DOCTOR';

        // 1. Gather Context with Role-Based Filtering
        let patientsQuery = supabase.from('Patient').select('id, name, email, phone, dni, insurance, assignedDoctorId, createdAt').limit(10);

        // Role-based patient filtering
        if (isDoctor && doctorId) {
            // Doctors only see their assigned patients
            patientsQuery = patientsQuery.eq('assignedDoctorId', doctorId);
        }
        // ADMIN and RECEPTION see all patients

        const { data: patients, error: patientsError } = await patientsQuery;
        if (patientsError) console.error("AI: Error fetching patients:", patientsError.message);

        // Fetch clinical records for found patients
        let clinicalRecords = [];
        if (patients && patients.length > 0) {
            const patientIds = patients.map(p => p.id);
            const { data: records } = await supabase
                .from('ClinicalRecord')
                .select('id, patientId, date, text')
                .in('patientId', patientIds)
                .limit(20);
            clinicalRecords = records || [];
        }

        // Fetch inventory (all roles can see)
        const { data: stock } = await supabase.from('InventoryItem').select('*');

        // Fetch appointments with role filtering
        let appointmentsQuery = supabase
            .from('Appointment')
            .select('id, date, time, status, patientId, doctorId, treatmentId')
            .gte('date', new Date().toISOString())
            .limit(15);

        if (isDoctor && doctorId) {
            appointmentsQuery = appointmentsQuery.eq('doctorId', doctorId);
        }
        const { data: appointments } = await appointmentsQuery;

        // Fetch liquidations (ADMIN only)
        let liquidations = [];
        if (isVIP) {
            const { data: liqData } = await supabase
                .from('Liquidation')
                .select('*')
                .order('createdAt', { ascending: false })
                .limit(10);
            liquidations = liqData || [];
        }

        // Build context with role-based constraints
        const constraints = isVIP
            ? "USER ROLE: OWNER/ADMIN. Full Access granted to all financial and medical data."
            : isDoctor
                ? `USER ROLE: DOCTOR (ID: ${doctorId}). You can only see and modify data for YOUR assigned patients. Do NOT disclose other doctors' data or global financials.`
                : "USER ROLE: RECEPTION/STAFF. You can see patient appointments and basic info. RESTRICTED ACCESS to financial data and liquidations.";

        // Map patients with their clinical history
        const patientsWithHistory = (patients || []).map(p => ({
            ...p,
            clinicalHistory: clinicalRecords.filter(r => r.patientId === p.id)
        }));

        const context = `
        SYSTEM CONTEXT (${userRole} MODE):
        - Current Date: ${new Date().toISOString()}
        - Inventory: ${JSON.stringify(stock || [])}
        - Recent Liquidations: ${JSON.stringify(liquidations)}
        - Next Appointments: ${JSON.stringify(appointments || [])}
        - Patients (with history): ${JSON.stringify(patientsWithHistory)}
        - ACTIVE UI CONTEXT: ${JSON.stringify(extraContext)}
        
        ${constraints}

        You are ControlMed AI, an intelligent assistant for a dental clinic CRM.
        You have access to read and WRITE medical records within your permissions.
        Always respond in Spanish (Español) unless explicitly asked otherwise.
        
        PROTOCOL FOR ACTIONS (JSON):
        If the user requests to UPDATE THE ODONTOGRAM (e.g., "mark tooth 18 as caries"), YOU MUST RETURN JSON:
        { "action": "UPDATE_ODONTOGRAM", "data": { "tooth": 18, "status": "CARIES" }, "answer": "Marcando pieza 18 con caries." }
        
        If the user requests to ADD A CLINICAL RECORD (e.g., "add history note"), you can use the function 'add_clinical_note' OR return JSON:
        { "action": "ADD_RECORD", "data": { "treatment": "...", "observation": "...", "specialization": "..." }, "answer": "Añadiendo registro..." }
        
        Otherwise, return plain text answer or use other tools.
        `;

        // 2. Define Tools
        const tools = [
            {
                type: "function",
                function: {
                    name: "add_clinical_note",
                    description: "Add a new entry to a patient's clinical history.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Fuzzy name of the patient" },
                            note: { type: "string", description: "The clinical note content" }
                        },
                        required: ["patientName", "note"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "create_prescription",
                    description: "Generate a prescription (Receta) for a patient.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Name of the patient" },
                            medication: { type: "string", description: "Medication name and dosage" },
                            instructions: { type: "string", description: "Usage instructions" }
                        },
                        required: ["patientName", "medication", "instructions"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_patient_email",
                    description: "Update the email address of a patient.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Name of the patient" },
                            newEmail: { type: "string", description: "New email address" }
                        },
                        required: ["patientName", "newEmail"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "create_budget_draft",
                    description: "Create a budget draft for a patient based on dental needs.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Name of the patient" },
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        treatmentName: { type: "string" },
                                        tooth: { type: "string" },
                                        price: { type: "number" }
                                    }
                                }
                            }
                        },
                        required: ["patientName", "items"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "format_clinical_history",
                    description: "Format raw text into structured clinical history.",
                    parameters: {
                        type: "object",
                        properties: {
                            rawText: { type: "string" }
                        },
                        required: ["rawText"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_patients",
                    description: "Search for patients by name, DNI, or other criteria.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search term (name, DNI, email)" }
                        },
                        required: ["query"]
                    }
                }
            }
        ];

        // 3. Call OpenAI
        const aiClient = getOpenAI();
        const response = await aiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: context },
                { role: "user", content: userQuery }
            ],
            tools: tools,
            tool_choice: "auto"
        });

        const responseMessage = response.choices[0].message;

        // 4. Handle Tool Calls
        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);

                if (toolCall.function.name === "add_clinical_note") {
                    return await handleAddClinicalNote(supabase, args, userInfo);
                }
                if (toolCall.function.name === "create_prescription") {
                    return await handleCreatePrescription(supabase, args, userInfo);
                }
                if (toolCall.function.name === "update_patient_email") {
                    return await handleUpdatePatientEmail(supabase, args, userInfo);
                }
                if (toolCall.function.name === "create_budget_draft") {
                    return await handleCreateBudgetDraft(supabase, args, userInfo);
                }
                if (toolCall.function.name === "format_clinical_history") {
                    return await handleFormatClinicalHistory(args);
                }
                if (toolCall.function.name === "search_patients") {
                    return await handleSearchPatients(supabase, args, userInfo);
                }
            }
        }

        return { type: 'text', content: responseMessage.content };

    } catch (error) {
        console.error("AI Error Details:", {
            message: error.message,
            code: error.code,
            type: error.type,
            keyStatus: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.substring(0, 5)}...)` : 'Missing'
        });
        return { type: 'error', content: `AI Error: ${error.message || "Check API Key"}` };
    }
}

async function handleAddClinicalNote(supabase, { patientName, note }, userInfo) {
    // Fuzzy Search via ilike
    const { data: patients } = await supabase
        .from('Patient')
        .select('id, name, assignedDoctorId')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];

    if (!patient) {
        return { type: 'error', content: `No encontré al paciente "${patientName}".` };
    }

    // Check permissions: Doctors can only modify their own patients
    if (userInfo.role === 'DOCTOR' && userInfo.doctorId && patient.assignedDoctorId !== userInfo.doctorId) {
        return { type: 'error', content: `No tienes permiso para modificar la historia de este paciente.` };
    }

    const { error } = await supabase.from('ClinicalRecord').insert([{
        id: require('crypto').randomUUID(),
        patientId: patient.id,
        date: new Date().toISOString(),
        text: note,
        authorId: userInfo.id || 'ai-agent'
    }]);

    if (error) {
        return { type: 'error', content: `Error al guardar nota: ${error.message}` };
    }

    return { type: 'action_completed', content: `✅ Nota añadida a la historia de ${patient.name}: "${note}"` };
}

async function handleCreatePrescription(supabase, { patientName, medication, instructions }, userInfo) {
    const { data: patients } = await supabase
        .from('Patient')
        .select('id, name, assignedDoctorId')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    // Permission check
    if (userInfo.role === 'DOCTOR' && userInfo.doctorId && patient.assignedDoctorId !== userInfo.doctorId) {
        return { type: 'error', content: `No tienes permiso para crear recetas para este paciente.` };
    }

    const note = `[RECETA] Medicamento: ${medication}. Instrucciones: ${instructions}`;
    const { error } = await supabase.from('ClinicalRecord').insert([{
        id: require('crypto').randomUUID(),
        patientId: patient.id,
        date: new Date().toISOString(),
        text: note,
        authorId: userInfo.id || 'ai-agent'
    }]);

    if (error) {
        return { type: 'error', content: `Error al guardar receta: ${error.message}` };
    }

    return { type: 'action_completed', content: `✅ Receta generada para ${patient.name}: ${medication}` };
}

async function handleUpdatePatientEmail(supabase, { patientName, newEmail }, userInfo) {
    const { data: patients } = await supabase
        .from('Patient')
        .select('id, name, assignedDoctorId')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    // Permission check
    if (userInfo.role === 'DOCTOR' && userInfo.doctorId && patient.assignedDoctorId !== userInfo.doctorId) {
        return { type: 'error', content: `No tienes permiso para modificar este paciente.` };
    }

    const { error } = await supabase
        .from('Patient')
        .update({ email: newEmail })
        .eq('id', patient.id);

    if (error) {
        return { type: 'error', content: `Error al actualizar email: ${error.message}` };
    }

    return { type: 'action_completed', content: `✅ Email de ${patient.name} actualizado a ${newEmail}` };
}

async function handleCreateBudgetDraft(supabase, { patientName, items }, userInfo) {
    const { data: patients } = await supabase
        .from('Patient')
        .select('id, name')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    const budgetId = require('crypto').randomUUID();
    let total = 0;

    // Create budget
    const { error: budgetError } = await supabase.from('Budget').insert([{
        id: budgetId,
        patientId: patient.id,
        status: 'DRAFT',
        totalAmount: 0,
        date: new Date().toISOString()
    }]);

    if (budgetError) {
        return { type: 'error', content: `Error al crear presupuesto: ${budgetError.message}` };
    }

    // Create line items
    for (const item of items) {
        const price = item.price || 50;
        total += price;

        await supabase.from('BudgetLineItem').insert([{
            id: require('crypto').randomUUID(),
            budgetId: budgetId,
            name: item.treatmentName,
            price: price,
            tooth: item.tooth,
            quantity: 1
        }]);
    }

    // Update total
    await supabase.from('Budget').update({ totalAmount: total }).eq('id', budgetId);

    return { type: 'action_completed', content: `✅ Presupuesto borrador creado para ${patient.name} con ${items.length} items. Total aprox: ${total}€` };
}

async function handleFormatClinicalHistory({ rawText }) {
    try {
        const aiClient = getOpenAI();
        const completion = await aiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Acting as an expert medical scribe, structure the following raw comments into sections: 'Motivo Consulta', 'Tratamiento Realizado', 'Plan / Próxima Visita'. Fix grammar and typos. Use professional medical Spanish. Return JSON." },
                { role: "user", content: rawText }
            ],
            response_format: { type: "json_object" }
        });

        const res = JSON.parse(completion.choices[0].message.content);

        const formattedString = `
**Motivo Consulta:** ${res['Motivo Consulta'] || res.MotivoConsulta || '-'}

**Tratamiento Realizado:** ${res['Tratamiento Realizado'] || res.TratamientoRealizado || '-'}

**Plan / Próxima Visita:** ${res['Plan / Próxima Visita'] || res.PlanProximaVisita || '-'}
`;

        return {
            type: 'formatted_text',
            content: formattedString,
            data: res
        };
    } catch (e) {
        console.error("Format Error:", e);
        return { type: 'error', content: "Error al formatear el texto clínico." };
    }
}

async function handleSearchPatients(supabase, { query }, userInfo) {
    let search = supabase
        .from('Patient')
        .select('id, name, email, phone, dni, assignedDoctorId')
        .or(`name.ilike.%${query}%,dni.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

    // Role-based filtering
    if (userInfo.role === 'DOCTOR' && userInfo.doctorId) {
        search = search.eq('assignedDoctorId', userInfo.doctorId);
    }

    const { data: patients, error } = await search;

    if (error) {
        return { type: 'error', content: `Error en búsqueda: ${error.message}` };
    }

    if (!patients || patients.length === 0) {
        return { type: 'text', content: `No se encontraron pacientes con "${query}".` };
    }

    const list = patients.map(p => `• ${p.name} (DNI: ${p.dni}, Email: ${p.email})`).join('\n');
    return { type: 'text', content: `Encontré ${patients.length} paciente(s):\n${list}` };
}

module.exports = { processQuery };
