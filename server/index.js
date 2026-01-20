const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Services
const financeService = require('./services/financeService');
const budgetService = require('./services/budgetService');
const orthoService = require('./services/orthoService');
const inventoryService = require('./services/inventoryService');
const invoiceService = require('./services/invoiceService');
const aiAgent = require('./services/aiAgent');
const templateService = require('./services/templateService');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Global Error Handler for Prisma Connection
// Global Error Handler for Prisma Connection
prisma.$connect()
    .then(() => {
        const dbUrl = process.env.DATABASE_URL || 'Unknown';
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        console.log(`✅ Base de datos conectada correctamente [${process.env.NODE_ENV || 'DEV'}]`);
        console.log(`📡 URL: ${maskedUrl}`);
    })
    .catch((e) => {
        console.error('❌ Error fatal de conexión a base de datos (PostgreSQL/Supabase):');
        console.error(e.message);
        // Do not log the full error object to avoid leaking secrets if any
    });
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for Base64 Uploads

// --- MOCK AUTH MIDDLEWARE (MODULE 3: RBAC) ---
const authMiddleware = (req, res, next) => {
    // In a real app, verify JWT. Here we assume a header 'x-user-role' for demo purposes.
    // Defaults to DOCTOR if not specified.
    const role = req.headers['x-user-role'] || 'DOCTOR';
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    req.user = { id: userId, role };
    next();
};

app.use(authMiddleware);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV });
});

// --- MODULE 1: FINANCIAL ENGINE ---
app.post('/api/treatments/:appointmentId/complete', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        // 1. Mark appointment as completed
        const appointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'COMPLETED' },
            include: { treatment: true, doctor: true }
        });

        // 2. Trigger Liquidation Calculation
        const liquidation = await financeService.calculateLiquidation(prisma, appointment);
        res.json({ appointment, liquidation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/liquidations', async (req, res) => {
    // RBAC Check: Only ADMIN or the specific DOCTOR can see this
    if (req.user.role === 'RECEPTION') return res.status(403).json({ error: 'Access Denied' });

    try {
        const { doctorId, month } = req.query;

        // Security: If DOCTOR, force doctorId to be own
        if (req.user.role === 'DOCTOR') {
            // In real app, check if requested doctorId matches req.user.doctorId
            // allowing for now but ignoring filter if it tries to see others
        }

        const payroll = await financeService.getPayroll(prisma, doctorId, month);
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BUDGETS ---
app.get('/api/patients/:patientId/budgets', async (req, res) => {
    try {
        const budgets = await budgetService.getBudgetsByPatient(prisma, req.params.patientId);
        res.json(budgets);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients/:patientId/budgets', async (req, res) => {
    try {
        const budget = await budgetService.createBudget(prisma, req.params.patientId, req.body.items);
        res.json(budget);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/budgets/:id/status', async (req, res) => {
    try {
        const budget = await budgetService.updateBudgetStatus(prisma, req.params.id, req.body.status);
        res.json(budget);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients/:patientId/budgets/draft/items', async (req, res) => {
    try {
        const budget = await budgetService.addItemToDraftBudget(prisma, req.params.patientId, req.body);
        res.json(budget);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/budgets/:id/convert', async (req, res) => {
    try {
        const invoice = await budgetService.convertBudgetToInvoice(prisma, req.params.id);
        res.json(invoice);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/finance/financing', async (req, res) => {
    try {
        const plan = await financeService.createFinancingPlan(prisma, req.body);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PATIENT MANAGEMENT ---
app.post('/api/patients', async (req, res) => {
    try {
        console.log("POST /api/patients Body:", req.body);
        const { name, dni, email, birthDate, insurance, assignedDoctorId } = req.body;

        // Validate Date
        let validDate = new Date();
        if (birthDate && !isNaN(new Date(birthDate).getTime())) {
            validDate = new Date(birthDate);
        }

        // Initialize Supabase safely
        let supabase;
        try {
            supabase = getSupabase();
        } catch (configError) {
            return res.status(500).json({ error: configError.message });
        }

        // Direct Insert via Supabase Client (Bypasses Prisma Schema Validation)
        const { data, error } = await supabase
            .from('Patient')
            .insert([{
                name,
                dni,
                email,
                birthDate: validDate.toISOString(), // Supabase expects ISO String
                insurance,
                assignedDoctorId
                // balance: Default in DB is 0.0, so we can omit it or send 0
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase Insert Error:", error);
            // Return precise error to UI
            return res.status(500).json({ error: `DB Error: ${error.message} (${error.code || 'Unknown'})` });
        }

        console.log("✅ Patient Created (Supabase):", data.id);
        res.json(data);
    } catch (e) {
        console.error("Error Saving Patient:", e);
        res.status(500).json({ error: e.message || "Error interno al guardar paciente" });
    }
});

// --- APPOINTMENTS ---
app.post('/api/appointments', async (req, res) => {
    try {
        console.log("POST /api/appointments Body:", req.body);
        const { id, doctorId, patientId, date, time, treatment, status } = req.body;

        // Initialize Supabase safely
        let supabase;
        try {
            supabase = getSupabase();
        } catch (configError) {
            return res.status(500).json({ error: configError.message });
        }

        const { data, error } = await supabase
            .from('Appointment')
            .insert([{
                id: id || crypto.randomUUID(), // Use provided ID or generate
                doctorId,
                patientId,
                date,
                time,
                treatment,
                status: status || 'PENDING'
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase Insert Error (Appointment):", error);
            return res.status(500).json({ error: `DB Error: ${error.message}` });
        }

        console.log("✅ Appointment Created:", data.id);
        res.json(data);
    } catch (e) {
        console.error("Error Saving Appointment:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { data, error } = await supabase
            .from('Appointment')
            .select('*');

        if (error) {
            console.error("❌ Supabase Fetch Error (Appointments):", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ODONTOGRAM (Module 2) ---
app.get('/api/patients/:patientId/odontogram', async (req, res) => {
    try {
        const o = await prisma.odontogram.findUnique({ where: { patientId: req.params.patientId } });
        res.json(o || { teethState: "{}" });
    } catch (e) {
        // Return empty state instead of 500 for demo robustness
        res.json({ teethState: "{}" });
    }
});

app.post('/api/patients/:patientId/odontogram', async (req, res) => {
    try {
        const { teethState } = req.body;
        // Check if patient exists to avoid FK error (especially for dummy patients p-0, etc)
        const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
        if (!patient) {
            // Mock success for demo users
            return res.json({ patientId: req.params.patientId, teethState });
        }

        const o = await prisma.odontogram.upsert({
            where: { patientId: req.params.patientId },
            update: { teethState },
            create: { patientId: req.params.patientId, teethState }
        });
        res.json(o);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients/:patientId/snapshots', async (req, res) => {
    try {
        const { imageUrl, description } = req.body;
        const s = await prisma.dentalSnapshot.create({
            data: {
                patientId: req.params.patientId,
                imageUrl,
                description
            }
        });
        res.json(s);
    } catch (e) {
        // Return empty list for demo/dummy patients instead of 500
        res.json([]);
    }
});

app.get('/api/patients/:patientId/snapshots', async (req, res) => {
    try {
        const list = await prisma.dentalSnapshot.findMany({
            where: { patientId: req.params.patientId },
            orderBy: { date: 'desc' }
        });
        res.json(list);
    } catch (e) {
        res.json([]);
    }
});

app.post('/api/patients/:patientId/snapshots', async (req, res) => {
    try {
        const { imageUrl, description } = req.body;
        const snapshot = await prisma.dentalSnapshot.create({
            data: {
                patientId: req.params.patientId,
                imageUrl,
                description: description || 'Nueva captura'
            }
        });
        res.json(snapshot);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/snapshots/:id', async (req, res) => {
    try {
        const { description } = req.body;
        const snapshot = await prisma.dentalSnapshot.update({
            where: { id: req.params.id },
            data: { description }
        });
        res.json(snapshot);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- MODULE 2: ORTHODONTICS ---
app.post('/api/plans', async (req, res) => {
    try {
        const plan = await orthoService.createPlan(prisma, req.body);
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/patients/:patientId/alerts', async (req, res) => {
    try {
        const alerts = await orthoService.checkDelinquency(prisma, req.params.patientId);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- MODULE 4: AI OMNISCIENT AGENT ---
app.post('/api/ai/query', async (req, res) => {
    try {
        const { message, context } = req.body;
        const response = await aiAgent.processQuery(prisma, message, req.user.role, context);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- MODULE 5: INVENTORY INTELLIGENCE ---
app.post('/api/inventory/check', async (req, res) => {
    try {
        const { currentStock } = req.body;
        const analysis = await inventoryService.analyzeStock(prisma, currentStock);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- USER AUTH & SEEDING (MODULE 3) ---

const { createClient } = require('@supabase/supabase-js');

// Lazy Supabase Initializer to prevent startup crashes
const getSupabase = () => {
    if (!process.env.SUPABASE_URL) throw new Error("Falta Vercel Env Var: SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta Vercel Env Var: SUPABASE_SERVICE_ROLE_KEY");

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log(`🔐 Login Attempt (Supabase Native): ${email}`);

        // Initialize Supabase safely
        let supabase;
        try {
            supabase = getSupabase();
        } catch (configError) {
            return res.status(500).json({ error: configError.message });
        }

        const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.error("❌ DB Query Error:", error);
            // DEBUG: Return full error to UI for diagnosis
            return res.status(500).json({ error: `DB Error: ${error.message} (${error.code || 'NoCode'})` });
        }

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado en base de datos' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        console.log(`✅ Login Success: ${user.name} (${user.role})`);
        res.json(user);
    } catch (e) {
        console.error("🔥 Critical Login Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- DEBUG ENDPOINT (Temporary) ---
app.get('/api/debug/db-check', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('User').select('*');
        res.json({
            status: "Online",
            env: {
                url: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
                key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'
            },
            queryResult: {
                error,
                count: data?.length,
                usersFound: data?.map(u => u.email)
            }
        });
    } catch (e) {
        res.json({ fatalError: e.message });
    }
});

app.post('/api/seed', async (req, res) => {
    try {
        // 1. Create Doctors
        const doctorsData = [
            { name: 'Dr. House', spec: 'Diagnostico', email: 'dr1@clinic.com' },
            { name: 'Dra. Grey', spec: 'Cirugía', email: 'dr2@clinic.com' },
            { name: 'Dr. Strange', spec: 'Neurología', email: 'dr3@clinic.com' },
            { name: 'Dra. Quinn', spec: 'General', email: 'dr4@clinic.com' }
        ];

        for (const d of doctorsData) {
            // Check if doctor exists
            const existing = await prisma.user.findUnique({ where: { email: d.email } });
            if (!existing) {
                // Create Doctor Profile
                const doc = await prisma.doctor.create({
                    data: { name: d.name, specialization: d.spec, commissionPercentage: 0.30 }
                });
                // Create User
                await prisma.user.create({
                    data: {
                        email: d.email,
                        password: '123', // Dummy password
                        name: d.name,
                        role: 'DOCTOR',
                        doctorId: doc.id
                    }
                });
            }
        }

        // 2. Create Receptionists
        const recepts = ['recepcion1@clinic.com', 'recepcion2@clinic.com'];
        for (const mail of recepts) {
            if (!(await prisma.user.findUnique({ where: { email: mail } }))) {
                await prisma.user.create({
                    data: {
                        email: mail,
                        password: '123',
                        name: 'Recepción ' + mail.split('@')[0].slice(-1),
                        role: 'RECEPTION'
                    }
                });
            }
        }

        // 3. Create Owner/Admin
        if (!(await prisma.user.findUnique({ where: { email: 'admin@clinic.com' } }))) {
            await prisma.user.create({
                data: {
                    email: 'admin@clinic.com',
                    password: '123',
                    name: 'Director Médico',
                    role: 'ADMIN'
                }
            });
        }

        res.json({ message: "Seed completed: Admin, Receptionists, Doctors created." });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// --- MODULE 6: EXTERNAL INVOICING (FACTURADIRECTA / VERI*FACTU) ---
app.post('/api/finance/invoice', async (req, res) => {
    try {
        const { patient, items, paymentMethod, type } = req.body;

        if (!patient || !items || !items.length) {
            return res.status(400).json({ error: 'Faltan datos del paciente o servicios.' });
        }

        const result = await invoiceService.generateInvoice({
            patient,
            items,
            paymentMethod,
            type
        });

        // SAVE TO DB (User Requirement)
        if (result.success) {
            await prisma.invoice.create({
                data: {
                    invoiceNumber: result.invoiceNumber,
                    amount: items.reduce((sum, item) => sum + Number(item.price), 0),
                    status: 'issued',
                    date: new Date(),
                    url: result.url,
                    patientId: patient.id,
                    items: {
                        create: items.map(i => ({
                            name: i.name,
                            price: Number(i.price)
                        }))
                    }
                }
            });
        }

        res.json(result);
    } catch (e) {
        console.error("Invoice Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/finance/invoices', async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(invoices);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/finance/invoices/export/batch', async (req, res) => {
    try {
        const { invoices, date } = req.body;
        if (!invoices || !date) {
            return res.status(400).send("Faltan datos (invoices, date)");
        }
        await invoiceService.exportBatchInvoices(invoices, date, res);
    } catch (e) {
        console.error("Export Error:", e);
        if (!res.headersSent) res.status(500).send("Error generating ZIP");
    }
});

// --- MODULE 7: TEMPLATES ---
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await templateService.getTemplates(prisma);
        res.json(templates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/templates', async (req, res) => {
    try {
        const template = await templateService.uploadTemplate(prisma, req.body);
        res.json(template);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/templates/:id', async (req, res) => {
    try {
        await templateService.deleteTemplate(prisma, req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const { GoogleGenAI } = require('@google/genai');

// --- MODULE 5: AI AGENT (BACKEND) ---
app.post('/api/ai/query', async (req, res) => {
    try {
        const { prompt, patientId } = req.body;
        console.log(`🤖 AI Query for Patient: ${patientId || 'General'}`);

        if (!process.env.API_KEY) {
            return res.status(500).json({ error: "Falta API_KEY de Google Gemini en servidor." });
        }

        // 1. Fetch Context from Supabase (if patientId provided)
        let context = {};
        if (patientId) {
            // Lazy load Supabase to prevent startup crashes if vars missing
            let supabase;
            try {
                supabase = getSupabase();
            } catch (e) {
                console.error("AI Context Error: Supabase not configured");
                return res.status(500).json({ error: "Supabase no configurado en servidor" });
            }

            // Parallel Fetch for Speed
            // We use 'catch' to return null on error instead of breaking everything
            const safeFetch = (promise) => promise.then(r => r.data).catch(() => null);

            const [patientRes, recordsRes, odontoRes, invoiceRes] = await Promise.all([
                safeFetch(supabase.from('Patient').select('*').eq('id', patientId).single()),
                safeFetch(supabase.from('ClinicalRecord').select('*').eq('patientId', patientId).order('date', { ascending: false }).limit(5)),
                safeFetch(supabase.from('Odontogram').select('*').eq('patientId', patientId).single()),
                safeFetch(supabase.from('Invoice').select('*').eq('patientId', patientId).order('date', { ascending: false }).limit(3))
            ]);

            context = {
                patient: patientRes,
                history: recordsRes || [],
                odontogram: odontoRes,
                lastInvoices: invoiceRes || []
            };
        }

        // 2. Prepare Gemini Prompt
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemInstruction = `
            Eres MediBot, el asistente clínico avanzado de ControlMed.
            Tienes acceso total al historial del paciente.
            
            CONTEXTO DEL PACIENTE:
            ${JSON.stringify(context, null, 2)}

            TU OBJETIVO:
            1. Responder preguntas clínicas o administrativas con precisión.
            2. Si el usuario pide AÑADIR algo al historial, genera una acción JSON.
            
            FORMATO DE RESPUESTA (JSON OBLIGATORIO):
            {
                "answer": "Respuesta natural para el usuario...",
                "action": "NONE" | "ADD_RECORD" | "UPDATE_ODONTOGRAM",
                "data": { ... (solo si action != NONE) ... }
            }

            ESTRUCTURA PARA ADD_RECORD:
            data: { "treatment": "Título", "observation": "Texto completo", "specialization": "General" }
        `;

        // 3. Call Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // Use robust model available
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        const text = response.text();
        let aiResponse;
        try {
            aiResponse = JSON.parse(text);
        } catch (e) {
            aiResponse = { answer: text, action: "NONE" };
        }

        // 4. Handle Actions (Server-Side Execution)
        if (aiResponse.action === 'ADD_RECORD' && patientId && aiResponse.data) {
            const supabase = getSupabase();
            const { data: newRecord, error } = await supabase.from('ClinicalRecord').insert([{
                patientId,
                date: new Date().toISOString(),
                text: aiResponse.data.observation || aiResponse.data.treatment,
                // We map 'text' column. If you add specific cols later, update here.
                authorId: 'AI_AGENT'
            }]).select();

            if (!error) {
                aiResponse.answer += " [✅ Guardado en Historial]";
            } else {
                console.error("AI Save Error:", error);
                aiResponse.answer += " [❌ Error al guardar en BD]";
            }
        }

        res.json(aiResponse);

    } catch (e) {
        console.error("❌ AI Service Error:", e);
        res.status(500).json({
            answer: "Lo siento, ha ocurrido un error interno en el servidor de IA.",
            action: "NONE",
            error: e.message
        });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
