
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function processQuery(prisma, userQuery, userRole = 'DOCTOR', extraContext = {}) {
    try {
        console.log("AI DEBUG: check prisma keys");
        // Check if prisma is valid
        if (!prisma) throw new Error("Prisma instance is undefined");

        // Log available models (keys starting with lowercase usually, depends on internal impl, but useful)
        // Actually PrismaClient puts models on the instance.
        // Let's try to access one.
        console.log("AI DEBUG: Models check:", {
            patient: !!prisma.patient,
            inventory: !!prisma.inventoryItem,
            liquidation: !!prisma.liquidation,
            appointment: !!prisma.appointment,
            role: userRole
        });

        const isVIP = userRole === 'ADMIN';

        // 1. Gather GOD MODE Context (Omniscient Read)
        // Fetch snapshot of critical data to feed the AI
        // SECURITY: Filter financials if not Admin
        const [patients, stock, liquidations, appointments] = await Promise.all([
            prisma.patient.findMany({ take: 5, include: { clinicalHistory: true } }),
            prisma.inventoryItem.findMany(),
            isVIP ? prisma.liquidation.findMany({ take: 10, orderBy: { createdAt: 'desc' } }) : [], // Hide financials from non-admins
            prisma.appointment.findMany({
                where: { date: { gte: new Date() } },
                take: 10
            })
        ]);

        const constraints = isVIP
            ? "USER ROLE: OWNER/ADMIN. Full Access granted to all financial and medical data."
            : "USER ROLE: STAFF (Doc/Recep). RESTRICTED ACCESS. You MUST NOT disclose clinic revenue, global billing, or other doctors' commissions. Refuse such queries.";

        const context = `
        SYSTEM CONTEXT (GOD MODE):
        - Current Date: ${new Date().toISOString()}
        - Inventory: ${JSON.stringify(stock)}
        - Recent Liquidations: ${JSON.stringify(liquidations)}
        - Next Appointments: ${JSON.stringify(appointments)}
        - Sample Patients: ${JSON.stringify(patients.map(p => ({ name: p.name, id: p.id, history: p.clinicalHistory })))}
        - ACTIVE UI CONTEXT: ${JSON.stringify(extraContext)}
        
        ${constraints}

        You are ControlMed AI. You have access to read and WRITE medical records within your permissions.
        
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
            }
        ];

        // 3. Call OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Using the provided key for GPT-4 capabilities
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
                    return await handleAddClinicalNote(prisma, args);
                }
                if (toolCall.function.name === "create_prescription") {
                    return await handleCreatePrescription(prisma, args);
                }
                if (toolCall.function.name === "update_patient_email") {
                    return await handleUpdatePatientEmail(prisma, args);
                }
                if (toolCall.function.name === "create_budget_draft") {
                    return await handleCreateBudgetDraft(prisma, args);
                }
                if (toolCall.function.name === "format_clinical_history") {
                    return await handleFormatClinicalHistory(args);
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

async function handleAddClinicalNote(prisma, { patientName, note }) {
    // Fuzzy Search Logic
    const patient = await prisma.patient.findFirst({
        where: { name: { contains: patientName } }
    });

    if (!patient) {
        return { type: 'error', content: `No encontré al paciente "${patientName}".` };
    }

    await prisma.clinicalRecord.create({
        data: {
            patientId: patient.id,
            date: new Date(),
            text: note,
            // Assuming linking to a default doctor or logged in user usually, for now null or seed doctor
        }
    });

    return { type: 'action_completed', content: `✅ Nota añadida a la historia de ${patient.name}: "${note}"` };
}

async function handleCreatePrescription(prisma, { patientName, medication, instructions }) {
    const patient = await prisma.patient.findFirst({ where: { name: { contains: patientName } } });
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    const note = `[RECETA] Medicamento: ${medication}. Instrucciones: ${instructions}`;
    await prisma.clinicalRecord.create({
        data: {
            patientId: patient.id,
            date: new Date(),
            text: note
        }
    });

    return { type: 'action_completed', content: `✅ Receta generada para ${patient.name}: ${medication}` };
}

async function handleUpdatePatientEmail(prisma, { patientName, newEmail }) {
    const patient = await prisma.patient.findFirst({ where: { name: { contains: patientName } } });
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    await prisma.patient.update({
        where: { id: patient.id },
        data: { email: newEmail }
    });

    return { type: 'action_completed', content: `✅ Email de ${patient.name} actualizado a ${newEmail}` };
}

async function handleCreateBudgetDraft(prisma, { patientName, items }) {
    const patient = await prisma.patient.findFirst({ where: { name: { contains: patientName } } });
    if (!patient) return { type: 'error', content: `Paciente "${patientName}" no encontrado.` };

    const { addItemToDraftBudget } = require('./budgetService');

    let total = 0;
    for (const item of items) {
        // Here we could look up real treatment prices if we had a catalog
        // For now take GPT's word or default
        const price = item.price || 50;

        await addItemToDraftBudget(patient.id, {
            name: item.treatmentName,
            price: price,
            tooth: item.tooth,
            quantity: 1
        });
        total += price;
    }

    return { type: 'action_completed', content: `✅ Presupuesto borrador creado para ${patient.name} con ${items.length} items. Total aprox: ${total}€` };
}

async function handleFormatClinicalHistory({ rawText }) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Acting as an expert medical scribe, structure the following raw comments into sections: 'Motivo Consulta', 'Tratamiento Realizado', 'Plan / Próxima Visita'. Fix grammar and typos. Use professional medical Spanish. Return JSON." },
                { role: "user", content: rawText }
            ],
            response_format: { type: "json_object" }
        });

        const res = JSON.parse(completion.choices[0].message.content);

        // Return a human readable string for the chat
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

module.exports = { processQuery };
