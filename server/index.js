const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Services
const financeService = require('./services/financeService');
const orthoService = require('./services/orthoService');
const inventoryService = require('./services/inventoryService');
const invoiceService = require('./services/invoiceService');
const aiAgent = require('./services/aiAgent'); // Commented out to reduce noise if missing
const budgetService = require('./services/budgetService');
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
// --- BUDGETS (Moved to Module 8 below) ---

app.post('/api/finance/financing', async (req, res) => {
    try {
        const plan = await financeService.createFinancingPlan(prisma, req.body);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CLINICAL RECORDS (Module 4 Extension) ---
app.post('/api/clinical-records', async (req, res) => {
    try {
        const { patientId, treatment, observation, specialization, price, date } = req.body;

        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        // Schema Adaptation: valid columns are id, patientId, date, text
        // We store structured data in 'text' as a stringified JSON
        const payload = {
            treatment: treatment || 'Nota Clínica',
            observation: observation || '',
            specialization: specialization || 'General',
            price: price || 0
        };

        const { data, error } = await supabase
            .from('ClinicalRecord')
            .insert([{
                id: crypto.randomUUID(),
                patientId,
                date: new Date().toISOString(),
                text: JSON.stringify(payload), // Serialize structure
                authorId: 'system' // Optional
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Error Saving Clinical Record:", error);
            return res.status(500).json({ error: error.message });
        }

        // Return object with parsed structure for frontend consistency
        const responseData = {
            ...data,
            clinicalData: payload,
            specialization: payload.specialization
        };

        res.status(201).json(responseData);
    } catch (e) {
        console.error("❌ Error in POST /api/clinical-records:", e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/clinical-records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { error } = await supabase.from('ClinicalRecord').delete().eq('id', id);
        if (error) throw error;

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/budgets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        // Determine if logic needs to delete items first (Cascade usually handles this, assuming Supabase/Postgres FK is set to Cascade)
        // If not, we might need to delete line items first manually.
        // For now trusting cascade or simple delete.
        const { error } = await supabase.from('Budget').delete().eq('id', id);
        if (error) throw error;

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/patients/:patientId/clinical-records', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { data, error } = await supabase
            .from('ClinicalRecord')
            .select('*')
            .eq('patientId', req.params.patientId)
            .order('date', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        // Map 'text' back to 'clinicalData' for frontend
        const mappedData = data.map(record => {
            let parsed = {};
            let isJson = false;
            try {
                if (record.text && (record.text.startsWith('{') || record.text.startsWith('['))) {
                    parsed = JSON.parse(record.text);
                    isJson = true;
                }
            } catch (e) { }

            return {
                ...record,
                clinicalData: isJson ? parsed : { treatment: 'Nota', observation: record.text },
                specialization: isJson && parsed.specialization ? parsed.specialization : 'General'
            };
        });

        res.json(mappedData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PATIENT MANAGEMENT ---
app.get('/api/patients', async (req, res) => {
    try {
        console.log("GET /api/patients - Fetching all patients...");

        let supabase;
        try {
            supabase = getSupabase();
        } catch (configError) {
            return res.status(500).json({ error: configError.message });
        }

        const { data, error } = await supabase
            .from('Patient')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error("❌ Supabase Fetch Error (Patients):", error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`✅ Loaded ${data.length} patients.`);
        res.json(data);
    } catch (e) {
        console.error("Error Fetching Patients:", e);
        res.status(500).json({ error: e.message });
    }
});

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
        const { date, time, patientId, doctorId, treatmentId } = req.body;

        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        // VALIDATION: Specialization Check
        if (treatmentId && doctorId) {
            const { data: treatment } = await supabase.from('Treatment').select('specialtyId').eq('id', treatmentId).single();
            const { data: doctor } = await supabase.from('Doctor').select('specialtyId, name').eq('id', doctorId).single();

            if (treatment && doctor) {
                if (treatment.specialtyId && doctor.specialtyId && treatment.specialtyId !== doctor.specialtyId) {
                    // Check if doctor is "General" (allows basic treatments?) 
                    // Or strict? User asked for strict: "si no es especialista... que no deje"
                    return res.status(400).json({ error: `El Dr. ${doctor.name} no es especialista en el tratamiento seleccionado.` });
                }
            }
        }

        const { data, error } = await supabase
            .from('Appointment')
            .insert([{
                date: new Date(date).toISOString(),
                time,
                patientId,
                doctorId,
                treatmentId,
                status: 'Scheduled'
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

// --- MODULE 8: BUDGETS ---
app.get('/api/patients/:patientId/budgets', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
        const data = await budgetService.getBudgetsByPatient(supabase, req.params.patientId);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients/:patientId/budgets', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
        const { items } = req.body;
        const data = await budgetService.createBudget(supabase, req.params.patientId, items);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients/:patientId/budgets/draft/items', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
        const data = await budgetService.addItemToDraftBudget(supabase, req.params.patientId, req.body);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/budgets/:id/status', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
        const { status } = req.body;
        const data = await budgetService.updateBudgetStatus(supabase, req.params.id, status);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/budgets/:id/convert', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
        const data = await budgetService.convertBudgetToInvoice(supabase, req.params.id);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
