
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

// Treatment prices catalog (default prices for common dental treatments)
const TREATMENT_CATALOG = {
    'extraccion': { name: 'Extracción dental', price: 80, status: 'EXTRACTED' },
    'extracción': { name: 'Extracción dental', price: 80, status: 'EXTRACTED' },
    'extraction': { name: 'Extracción dental', price: 80, status: 'EXTRACTED' },
    'endodoncia': { name: 'Endodoncia', price: 250, status: 'ENDODONCIA' },
    'empaste': { name: 'Empaste/Obturación', price: 60, status: 'FILLED' },
    'obturacion': { name: 'Obturación', price: 60, status: 'FILLED' },
    'obturación': { name: 'Obturación', price: 60, status: 'FILLED' },
    'limpieza': { name: 'Limpieza dental', price: 50, status: 'HEALTHY' },
    'corona': { name: 'Corona', price: 400, status: 'CROWN' },
    'implante': { name: 'Implante dental', price: 1200, status: 'IMPLANT' },
    'blanqueamiento': { name: 'Blanqueamiento', price: 300, status: 'HEALTHY' },
    'ortodoncia': { name: 'Ortodoncia', price: 2500, status: 'ORTHO' },
    'caries': { name: 'Tratamiento caries', price: 80, status: 'CARIES' },
    'funda': { name: 'Funda dental', price: 350, status: 'CROWN' },
    'reconstruccion': { name: 'Reconstrucción', price: 150, status: 'RECONSTRUCTED' },
    'reconstrucción': { name: 'Reconstrucción', price: 150, status: 'RECONSTRUCTED' }
};

async function processQuery(userQuery, userInfo = {}, extraContext = {}) {
    try {
        const supabase = getSupabase();
        const userRole = userInfo.role || 'DOCTOR';
        const userId = userInfo.id || null;
        const doctorId = userInfo.doctorId || null;

        console.log("AI DEBUG: Processing query with role:", userRole, "Query:", userQuery.substring(0, 100));

        const isVIP = userRole === 'ADMIN';
        const isDoctor = userRole === 'DOCTOR';
        const canModify = isVIP || isDoctor; // Both can modify patient data

        // 1. Gather Context with Role-Based Filtering
        let patientsQuery = supabase.from('Patient').select('id, name, email, phone, dni, insurance, assignedDoctorId, createdAt').limit(20);

        if (isDoctor && doctorId) {
            patientsQuery = patientsQuery.eq('assignedDoctorId', doctorId);
        }

        const { data: patients, error: patientsError } = await patientsQuery;
        if (patientsError) console.error("AI: Error fetching patients:", patientsError.message);

        // Fetch treatments catalog for pricing
        const { data: treatments } = await supabase.from('Treatment').select('id, name, price');

        // Fetch inventory
        const { data: stock } = await supabase.from('InventoryItem').select('*');

        // Fetch appointments
        let appointmentsQuery = supabase.from('Appointment').select('*').gte('date', new Date().toISOString()).limit(15);
        if (isDoctor && doctorId) appointmentsQuery = appointmentsQuery.eq('doctorId', doctorId);
        const { data: appointments } = await appointmentsQuery;

        // Fetch liquidations (ADMIN only)
        let liquidations = [];
        if (isVIP) {
            const { data: liqData } = await supabase.from('Liquidation').select('*').order('createdAt', { ascending: false }).limit(10);
            liquidations = liqData || [];
        }

        const constraints = canModify
            ? `USER ROLE: ${userRole}. Tienes permiso COMPLETO para modificar fichas de pacientes, odontogramas, crear presupuestos, y añadir historias clínicas.`
            : "USER ROLE: RECEPTION. Acceso de solo lectura. No puedes modificar datos.";

        const context = `
        CONTEXTO DEL SISTEMA (Rol: ${userRole}):
        - Fecha actual: ${new Date().toLocaleDateString('es-ES')}
        - Algunos pacientes en sistema: ${JSON.stringify((patients || []).slice(0, 5).map(p => ({ name: p.name, dni: p.dni })))}
        - Catálogo de tratamientos: ${JSON.stringify(treatments || [])}
        
        ${constraints}

        Eres ControlMed AI, el asistente inteligente de la clínica dental.
        
        ⚠️ REGLA CRÍTICA - SIEMPRE USA HERRAMIENTAS:
        Cuando el usuario mencione CUALQUIER acción con un paciente (añadir, crear, marcar, registrar, modificar, actualizar, etc.), 
        DEBES usar la herramienta correspondiente. NUNCA respondas "no encontré al paciente" sin antes intentar usar la herramienta.
        Las herramientas hacen su propia búsqueda del paciente - NO necesitas verificar si el paciente existe primero.
        
        INSTRUCCIONES:
        1. Para EXTRACCIONES + PRESUPUESTO: Usa "update_odontogram_and_create_budget" con el tipo "extraccion"
        2. Para AÑADIR NOTAS: Usa "add_clinical_record"
        3. Para CREAR CITAS: Usa "create_appointment"
        4. Para BUSCAR INFO: Usa "search_patient_info"
        
        Responde siempre en español.
        
        CATÁLOGO DE PRECIOS:
        - Extracción: 80€
        - Endodoncia: 250€
        - Empaste/Obturación: 60€
        - Corona: 400€
        - Implante: 1200€
        - Limpieza: 50€
        `;


        // 2. Define Tools - Enhanced with full capabilities
        const tools = [
            {
                type: "function",
                function: {
                    name: "update_odontogram_and_create_budget",
                    description: "Actualiza el odontograma del paciente marcando dientes con tratamientos específicos Y crea un presupuesto automáticamente. Usar cuando el usuario pida añadir extracciones, tratamientos, etc.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            treatments: {
                                type: "array",
                                description: "Lista de tratamientos a aplicar",
                                items: {
                                    type: "object",
                                    properties: {
                                        tooth: { type: "integer", description: "Número del diente (ej: 14, 27, 36)" },
                                        treatmentType: { type: "string", description: "Tipo: extraccion, endodoncia, empaste, corona, implante, caries, limpieza" },
                                        notes: { type: "string", description: "Notas adicionales opcionales" }
                                    },
                                    required: ["tooth", "treatmentType"]
                                }
                            },
                            createBudget: { type: "boolean", description: "Si se debe crear presupuesto automáticamente (default: true)" }
                        },
                        required: ["patientName", "treatments"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_odontogram",
                    description: "Actualiza solo el odontograma del paciente sin crear presupuesto.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            teeth: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        tooth: { type: "integer", description: "Número del diente" },
                                        status: { type: "string", description: "Estado: EXTRACTED, CARIES, FILLED, CROWN, IMPLANT, ENDODONCIA, HEALTHY" }
                                    },
                                    required: ["tooth", "status"]
                                }
                            }
                        },
                        required: ["patientName", "teeth"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "add_clinical_record",
                    description: "Añadir una nota o registro a la historia clínica del paciente.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            treatment: { type: "string", description: "Nombre del tratamiento realizado" },
                            observation: { type: "string", description: "Observaciones o notas clínicas" },
                            specialization: { type: "string", description: "Especialidad: General, Ortodoncia, Cirugía, Endodoncia, etc." }
                        },
                        required: ["patientName", "treatment", "observation"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "create_budget",
                    description: "Crear un presupuesto para un paciente con tratamientos específicos.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string", description: "Nombre del tratamiento" },
                                        price: { type: "number", description: "Precio en euros" },
                                        tooth: { type: "string", description: "Número del diente afectado" },
                                        quantity: { type: "integer", description: "Cantidad (default 1)" }
                                    },
                                    required: ["name", "price"]
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
                    name: "create_prescription",
                    description: "Generar una receta médica para un paciente.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            medication: { type: "string", description: "Medicamento y dosis" },
                            instructions: { type: "string", description: "Instrucciones de uso" }
                        },
                        required: ["patientName", "medication", "instructions"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "create_appointment",
                    description: "Crear una cita para un paciente.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente" },
                            date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
                            time: { type: "string", description: "Hora en formato HH:MM" },
                            treatmentType: { type: "string", description: "Tipo de tratamiento para la cita" }
                        },
                        required: ["patientName", "date", "time"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_patient_info",
                    description: "Buscar información completa de un paciente incluyendo historia clínica y odontograma.",
                    parameters: {
                        type: "object",
                        properties: {
                            patientName: { type: "string", description: "Nombre del paciente a buscar" }
                        },
                        required: ["patientName"]
                    }
                }
            }
        ];

        // 3. Detect if query is an action request - force tool usage
        const actionKeywords = ['añade', 'añadir', 'crear', 'crea', 'marcar', 'marca', 'registra', 'registrar',
            'modifica', 'modificar', 'actualiza', 'actualizar', 'extraccion', 'extracción',
            'presupuesto', 'odontograma', 'historia', 'cita', 'receta'];
        const queryLower = userQuery.toLowerCase();
        const isActionRequest = actionKeywords.some(kw => queryLower.includes(kw));

        // 4. Call OpenAI
        const aiClient = getOpenAI();
        const response = await aiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: context },
                { role: "user", content: userQuery }
            ],
            tools: tools,
            tool_choice: isActionRequest ? "required" : "auto"  // Force tool use for actions
        });

        const responseMessage = response.choices[0].message;

        // 4. Handle Tool Calls
        if (responseMessage.tool_calls) {
            const results = [];

            for (const toolCall of responseMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`AI: Executing tool ${toolCall.function.name} with args:`, JSON.stringify(args).substring(0, 200));

                let result;
                switch (toolCall.function.name) {
                    case "update_odontogram_and_create_budget":
                        result = await handleUpdateOdontogramAndBudget(supabase, args, userInfo);
                        break;
                    case "update_odontogram":
                        result = await handleUpdateOdontogram(supabase, args, userInfo);
                        break;
                    case "add_clinical_record":
                        result = await handleAddClinicalRecord(supabase, args, userInfo);
                        break;
                    case "create_budget":
                        result = await handleCreateBudget(supabase, args, userInfo);
                        break;
                    case "create_prescription":
                        result = await handleCreatePrescription(supabase, args, userInfo);
                        break;
                    case "create_appointment":
                        result = await handleCreateAppointment(supabase, args, userInfo);
                        break;
                    case "search_patient_info":
                        result = await handleSearchPatientInfo(supabase, args, userInfo);
                        break;
                    default:
                        result = { type: 'error', content: `Herramienta desconocida: ${toolCall.function.name}` };
                }

                results.push(result);
            }

            // Combine all results
            if (results.length === 1) {
                return results[0];
            }

            const combinedContent = results.map(r => r.content).join('\n\n');
            return { type: 'action_completed', content: combinedContent };
        }

        return { type: 'text', content: responseMessage.content };

    } catch (error) {
        console.error("AI Error Details:", {
            message: error.message,
            code: error.code,
            keyStatus: process.env.OPENAI_API_KEY ? 'Present' : 'Missing'
        });
        return { type: 'error', content: `AI Error: ${error.message || "Check API Key"}` };
    }
}

// ==================== TOOL HANDLERS ====================

async function findPatient(supabase, patientName, userInfo) {
    const { data: patients } = await supabase
        .from('Patient')
        .select('id, name, assignedDoctorId')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];
    if (!patient) return { error: `No se encontró al paciente "${patientName}"` };

    // Permission check for doctors
    if (userInfo.role === 'DOCTOR' && userInfo.doctorId && patient.assignedDoctorId !== userInfo.doctorId) {
        return { error: `No tienes permiso para modificar este paciente.` };
    }

    return { patient };
}

async function handleUpdateOdontogramAndBudget(supabase, { patientName, treatments, createBudget = true }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    const results = [];
    const budgetItems = [];

    // 1. Get current odontogram
    const { data: currentOdontogram } = await supabase
        .from('Odontogram')
        .select('*')
        .eq('patientId', patient.id)
        .single();

    let teethState = {};
    try {
        teethState = currentOdontogram?.teethState ? JSON.parse(currentOdontogram.teethState) : {};
    } catch (e) {
        teethState = {};
    }

    // 2. Process each treatment
    for (const t of treatments) {
        const treatmentKey = t.treatmentType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const catalogEntry = TREATMENT_CATALOG[treatmentKey] || TREATMENT_CATALOG[t.treatmentType.toLowerCase()];

        const status = catalogEntry?.status || t.treatmentType.toUpperCase();
        const price = catalogEntry?.price || 50;
        const name = catalogEntry?.name || t.treatmentType;

        // Update tooth state
        teethState[t.tooth.toString()] = {
            status: status,
            notes: t.notes || '',
            updatedAt: new Date().toISOString()
        };

        // Add to budget items
        budgetItems.push({
            name: name,
            price: price,
            tooth: t.tooth.toString(),
            quantity: 1
        });

        results.push(`• Diente ${t.tooth}: ${name} (${status})`);
    }

    // 3. Save odontogram
    const teethStateJson = JSON.stringify(teethState);

    if (currentOdontogram) {
        await supabase.from('Odontogram').update({ teethState: teethStateJson }).eq('patientId', patient.id);
    } else {
        await supabase.from('Odontogram').insert([{
            id: crypto.randomUUID(),
            patientId: patient.id,
            teethState: teethStateJson
        }]);
    }

    // 4. Create budget if requested
    let budgetTotal = 0;
    if (createBudget !== false && budgetItems.length > 0) {
        const budgetId = crypto.randomUUID();
        budgetTotal = budgetItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

        await supabase.from('Budget').insert([{
            id: budgetId,
            patientId: patient.id,
            status: 'DRAFT',
            totalAmount: budgetTotal,
            date: new Date().toISOString()
        }]);

        for (const item of budgetItems) {
            await supabase.from('BudgetLineItem').insert([{
                id: crypto.randomUUID(),
                budgetId: budgetId,
                name: item.name,
                price: item.price,
                tooth: item.tooth,
                quantity: item.quantity || 1
            }]);
        }
    }

    // 5. Add clinical record
    const clinicalNote = `Tratamientos registrados:\n${results.join('\n')}`;
    await supabase.from('ClinicalRecord').insert([{
        id: crypto.randomUUID(),
        patientId: patient.id,
        date: new Date().toISOString(),
        text: JSON.stringify({
            treatment: 'Actualización odontograma',
            observation: clinicalNote,
            specialization: 'General'
        }),
        authorId: userInfo.id || 'ai-agent'
    }]);

    let response = `✅ **Odontograma actualizado para ${patient.name}**\n\n${results.join('\n')}`;

    if (createBudget !== false && budgetTotal > 0) {
        response += `\n\n💰 **Presupuesto creado:** ${budgetTotal}€`;
    }

    return { type: 'action_completed', content: response };
}

async function handleUpdateOdontogram(supabase, { patientName, teeth }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    const { data: currentOdontogram } = await supabase
        .from('Odontogram')
        .select('*')
        .eq('patientId', patient.id)
        .single();

    let teethState = {};
    try {
        teethState = currentOdontogram?.teethState ? JSON.parse(currentOdontogram.teethState) : {};
    } catch (e) {
        teethState = {};
    }

    const updates = [];
    for (const t of teeth) {
        teethState[t.tooth.toString()] = {
            status: t.status.toUpperCase(),
            updatedAt: new Date().toISOString()
        };
        updates.push(`• Diente ${t.tooth}: ${t.status}`);
    }

    const teethStateJson = JSON.stringify(teethState);

    if (currentOdontogram) {
        await supabase.from('Odontogram').update({ teethState: teethStateJson }).eq('patientId', patient.id);
    } else {
        await supabase.from('Odontogram').insert([{
            id: crypto.randomUUID(),
            patientId: patient.id,
            teethState: teethStateJson
        }]);
    }

    return { type: 'action_completed', content: `✅ Odontograma de ${patient.name} actualizado:\n${updates.join('\n')}` };
}

async function handleAddClinicalRecord(supabase, { patientName, treatment, observation, specialization }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    await supabase.from('ClinicalRecord').insert([{
        id: crypto.randomUUID(),
        patientId: patient.id,
        date: new Date().toISOString(),
        text: JSON.stringify({
            treatment: treatment,
            observation: observation,
            specialization: specialization || 'General'
        }),
        authorId: userInfo.id || 'ai-agent'
    }]);

    return { type: 'action_completed', content: `✅ Historia clínica actualizada para ${patient.name}:\n• Tratamiento: ${treatment}\n• Observación: ${observation}` };
}

async function handleCreateBudget(supabase, { patientName, items }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    const budgetId = crypto.randomUUID();
    const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    await supabase.from('Budget').insert([{
        id: budgetId,
        patientId: patient.id,
        status: 'DRAFT',
        totalAmount: total,
        date: new Date().toISOString()
    }]);

    for (const item of items) {
        await supabase.from('BudgetLineItem').insert([{
            id: crypto.randomUUID(),
            budgetId: budgetId,
            name: item.name,
            price: item.price,
            tooth: item.tooth || null,
            quantity: item.quantity || 1
        }]);
    }

    const itemsList = items.map(i => `• ${i.name}: ${i.price}€${i.tooth ? ` (Diente ${i.tooth})` : ''}`).join('\n');
    return { type: 'action_completed', content: `✅ Presupuesto creado para ${patient.name}:\n${itemsList}\n\n💰 **Total: ${total}€**` };
}

async function handleCreatePrescription(supabase, { patientName, medication, instructions }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    const prescriptionNote = `[RECETA]\nMedicamento: ${medication}\nInstrucciones: ${instructions}`;

    await supabase.from('ClinicalRecord').insert([{
        id: crypto.randomUUID(),
        patientId: patient.id,
        date: new Date().toISOString(),
        text: JSON.stringify({
            treatment: 'Receta médica',
            observation: prescriptionNote,
            specialization: 'General'
        }),
        authorId: userInfo.id || 'ai-agent'
    }]);

    return { type: 'action_completed', content: `✅ Receta emitida para ${patient.name}:\n💊 ${medication}\n📋 ${instructions}` };
}

async function handleCreateAppointment(supabase, { patientName, date, time, treatmentType }, userInfo) {
    const { patient, error } = await findPatient(supabase, patientName, userInfo);
    if (error) return { type: 'error', content: error };

    // Get a doctor (use logged in doctor or first available)
    let doctorId = userInfo.doctorId;
    if (!doctorId) {
        const { data: doctors } = await supabase.from('Doctor').select('id').limit(1);
        doctorId = doctors?.[0]?.id;
    }

    await supabase.from('Appointment').insert([{
        id: crypto.randomUUID(),
        date: new Date(date).toISOString(),
        time: time,
        patientId: patient.id,
        doctorId: doctorId,
        status: 'Scheduled'
    }]);

    return { type: 'action_completed', content: `✅ Cita creada para ${patient.name}:\n📅 ${date} a las ${time}${treatmentType ? `\n🦷 ${treatmentType}` : ''}` };
}

async function handleSearchPatientInfo(supabase, { patientName }, userInfo) {
    const { data: patients } = await supabase
        .from('Patient')
        .select('*')
        .ilike('name', `%${patientName}%`)
        .limit(1);

    const patient = patients?.[0];
    if (!patient) return { type: 'error', content: `No se encontró al paciente "${patientName}"` };

    // Get clinical records
    const { data: records } = await supabase
        .from('ClinicalRecord')
        .select('*')
        .eq('patientId', patient.id)
        .order('date', { ascending: false })
        .limit(5);

    // Get odontogram
    const { data: odontogram } = await supabase
        .from('Odontogram')
        .select('*')
        .eq('patientId', patient.id)
        .single();

    // Get budgets
    const { data: budgets } = await supabase
        .from('Budget')
        .select('*')
        .eq('patientId', patient.id)
        .order('date', { ascending: false })
        .limit(3);

    let response = `📋 **${patient.name}**\n`;
    response += `• DNI: ${patient.dni}\n`;
    response += `• Email: ${patient.email}\n`;
    response += `• Teléfono: ${patient.phone || 'No registrado'}\n`;

    if (records && records.length > 0) {
        response += `\n📝 **Últimas notas clínicas:**\n`;
        records.forEach(r => {
            let text = r.text;
            try { text = JSON.parse(r.text)?.observation || r.text; } catch (e) { }
            response += `• ${new Date(r.date).toLocaleDateString('es-ES')}: ${text.substring(0, 100)}...\n`;
        });
    }

    if (odontogram) {
        let teethState = {};
        try { teethState = JSON.parse(odontogram.teethState); } catch (e) { }
        const affectedTeeth = Object.keys(teethState).filter(k => teethState[k]?.status !== 'HEALTHY');
        if (affectedTeeth.length > 0) {
            response += `\n🦷 **Dientes con tratamiento:** ${affectedTeeth.join(', ')}\n`;
        }
    }

    if (budgets && budgets.length > 0) {
        response += `\n💰 **Presupuestos:** ${budgets.length} (Total: ${budgets.reduce((s, b) => s + (b.totalAmount || 0), 0)}€)\n`;
    }

    return { type: 'text', content: response };
}

module.exports = { processQuery };
