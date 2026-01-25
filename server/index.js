const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');

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
        console.log("POST /api/patients Body:", JSON.stringify(req.body, null, 2)); // VERBOSE DEBUG

        // Clone body to avoid mutating req.body directly if needed, though req.body is usually fine
        const data = { ...req.body };

        // --- CRITICAL FIX: Ensure ID exists ---
        if (!data.id) {
            console.log("⚠️ ID missing in payload (Server), generating UUID...");
            data.id = crypto.randomUUID();
        } else {
            console.log("✅ ID present in payload:", data.id);
        }

        // --- FIX: Ensure birthDate exists (DB constraint) ---
        if (!data.birthDate) {
            console.log("⚠️ birthDate missing, using current date");
            data.birthDate = new Date().toISOString();
        }

        // Validate
        if (!data.name || !data.dni) {
            console.error("❌ Missing name or dni");
            return res.status(400).json({ error: "Name and DNI are required" });
        }

        // Explicitly insert the modified object 'data' NOT req.body
        const { data: created, error } = await getSupabase().from('Patient').insert(data).select().single();

        if (error) {
            console.error("❌ Supabase Insert Error:", error);
            throw error;
        }

        console.log("✅ Patient created:", created.id);
        res.json(created);
    } catch (e) {
        console.error("Error creating patient:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- APPOINTMENTS ---
app.post('/api/appointments', async (req, res) => {
    try {
        const { date, time, patientId, doctorId, treatmentId } = req.body;

        console.log('📅 Creating appointment:', { date, time, patientId, doctorId, treatmentId });

        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        // Sanitization: Ensure empty strings become null for UUID fields
        const safeTreatmentId = (treatmentId && treatmentId.trim()) ? treatmentId : null;
        const safeDoctorId = (doctorId && doctorId.trim()) ? doctorId : null;

        // VALIDATION: Specialization Check (Optional - skip if tables don't exist)
        if (safeTreatmentId && safeDoctorId) {
            try {
                const { data: treatment } = await supabase.from('Treatment').select('specialtyId').eq('id', safeTreatmentId).maybeSingle();
                const { data: doctor } = await supabase.from('Doctor').select('specialtyId, name').eq('id', safeDoctorId).maybeSingle();

                if (treatment && doctor) {
                    if (treatment.specialtyId && doctor.specialtyId && treatment.specialtyId !== doctor.specialtyId) {
                        return res.status(400).json({ error: `El Dr. ${doctor.name} no es especialista en el tratamiento seleccionado.` });
                    }
                }
            } catch (validationErr) {
                console.warn('⚠️ Specialization validation skipped:', validationErr.message);
            }
        }

        const { data, error } = await supabase
            .from('Appointment')
            .insert([{
                date: new Date(date).toISOString(),
                time,
                patientId,
                doctorId: safeDoctorId,
                treatmentId: safeTreatmentId,
                status: 'Scheduled'
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase Insert Error (Appointment):", JSON.stringify(error, null, 2));
            return res.status(500).json({
                error: `DB Error: ${error.message}`,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
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
        // Pass user info for role-based filtering (new Supabase-based agent)
        const userInfo = {
            id: req.user.id,
            role: req.user.role,
            doctorId: req.user.doctorId || null // Linked doctor profile if user is a doctor
        };
        const response = await aiAgent.processQuery(message, userInfo, context);
        res.json(response);
    } catch (error) {
        console.error("AI Query Error:", error);
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
// Lazy Supabase Initializer to prevent startup crashes
const getSupabase = () => {
    // HARDCODED DEBUGGING - REMOVE BEFORE FINAL PROD IF POSSIBLE
    const URL = "https://gnnacijqglcqonholpwt.supabase.co";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFjaWpxZ2xjcW9uaG9scHd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ3NjU0NCwiZXhwIjoyMDg0MDUyNTQ0fQ.6qexkezsBpOhvTch_eRsr8lF_mixdp9sfv0ScjUmxp4";

    return createClient(URL, KEY);
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
            try {
                const supabase = getSupabase();
                const totalAmount = items.reduce((sum, item) => sum + Number(item.price), 0);

                // 1. Create Invoice
                const { data: savedInvoice, error: invError } = await supabase
                    .from('Invoice')
                    .insert([{
                        invoiceNumber: result.invoiceNumber,
                        amount: totalAmount,
                        status: 'issued',
                        date: new Date().toISOString(),
                        url: result.url,
                        patientId: patient.id,
                        paymentMethod: paymentMethod || 'card'
                    }])
                    .select()
                    .single();

                if (invError) {
                    console.error("❌ DB Error saving Invoice header:", invError);
                } else if (savedInvoice) {
                    console.log(`✅ Invoice saved: ${savedInvoice.invoiceNumber} (ID: ${savedInvoice.id})`);

                    // 2. Create Items (InvoiceItem or similar)
                    if (items && items.length > 0) {
                        const invoiceItems = items.map(i => ({
                            invoiceId: savedInvoice.id,
                            name: i.name,
                            price: Number(i.price)
                        }));

                        const { error: itemError } = await supabase
                            .from('InvoiceItem')
                            .insert(invoiceItems);

                        if (itemError) console.error("❌ DB Error saving Invoice Items:", itemError);
                    }

                    // 3. Create Payment record for history
                    const paymentId = crypto.randomUUID();
                    const { error: paymentError } = await supabase
                        .from('Payment')
                        .insert([{
                            id: paymentId,
                            patientId: patient.id,
                            amount: totalAmount,
                            method: paymentMethod || 'card',
                            type: type || 'INVOICE',
                            invoiceId: savedInvoice.id,
                            createdAt: new Date().toISOString(),
                            notes: `Factura ${savedInvoice.invoiceNumber}`
                        }]);

                    if (paymentError) {
                        console.error("❌ DB Error saving Payment:", paymentError);
                    } else {
                        console.log(`✅ Payment recorded: ${totalAmount}€ (${paymentMethod})`);
                    }

                    // 4. Update Patient Wallet (saldo a cuenta)
                    // For ADVANCE_PAYMENT: add to wallet
                    // For regular invoice: could also track debt/credit
                    if (type === 'ADVANCE_PAYMENT' || type === 'PAGO_A_CUENTA') {
                        console.log(`💰 Updating wallet for patient ${patient.id}, amount: ${totalAmount}`);

                        const { data: pData, error: fetchErr } = await supabase
                            .from('Patient')
                            .select('wallet')
                            .eq('id', patient.id)
                            .single();

                        if (!fetchErr && pData) {
                            const currentWallet = pData.wallet || 0;
                            const newWallet = currentWallet + totalAmount;

                            const { error: updateErr } = await supabase
                                .from('Patient')
                                .update({ wallet: newWallet })
                                .eq('id', patient.id);

                            if (updateErr) console.error("❌ Failed to update wallet:", updateErr);
                            else console.log(`✅ Wallet updated: ${currentWallet} -> ${newWallet}`);
                        } else {
                            console.error("❌ Failed to fetch patient for wallet update:", fetchErr);
                        }
                    }
                }
            } catch (dbErr) {
                console.error("❌ Unexpected DB Error during Invoice save:", dbErr);
            }
        }

        res.json(result);
    } catch (e) {
        console.error("Invoice Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/finance/invoices/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Get Invoice Number from DB
        let supabase = getSupabase();
        let invoiceNumber = id; // Fallback if id IS the number

        // Try to find by ID first
        const { data: invById } = await supabase.from('Invoice').select('invoiceNumber, url').eq('id', id).single();
        if (invById) invoiceNumber = invById.invoiceNumber;
        else {
            // Try to find by Number
            const { data: invByNum } = await supabase.from('Invoice').select('invoiceNumber, url').eq('invoiceNumber', id).single();
            if (invByNum) invoiceNumber = invByNum.invoiceNumber;
            else {
                // If not found in DB, maybe it exists in FD directly or it's a test ID
                console.log(`⚠️ Invoice ${id} not found in DB, attempting to fetch from FD directly if possible.`);
            }
        }

        // 2. Refresh URL via Service
        // We'll call a new service method. If not implemented, we fallback to stored URL or return error.
        // For now, let's implement a simple direct refresh logic here or in service.
        // Best practice: Modify service.

        const freshUrl = await invoiceService.getFreshPdfUrl(invoiceNumber);
        if (freshUrl) {
            // Update DB with new URL to cache it briefly? 
            // Better not cache if it expires quickly.
            res.json({ url: freshUrl });
        } else {
            // Return stored URL if refresh failed (though it might be expired)
            res.json({ url: invById?.url || invById?.url || '' });
        }
    } catch (e) {
        console.error("Download Error:", e);
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

// --- PATIENT TREATMENTS (Tratamientos asignados a pacientes) ---
app.get('/api/patients/:patientId/treatments', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        // Fetch treatments - serviceName and price are stored directly in PatientTreatment
        const { data, error } = await supabase
            .from('PatientTreatment')
            .select('*')
            .eq('patientId', req.params.patientId)
            .order('createdAt', { ascending: false });

        if (error) {
            console.error("❌ Error fetching patient treatments:", error);
            return res.status(500).json({ error: error.message });
        }

        // Map data to ensure correct format for frontend
        const mapped = (data || []).map(t => ({
            id: t.id,
            patientId: t.patientId,
            serviceId: t.serviceId,
            serviceName: t.serviceName || 'Tratamiento',
            toothId: t.toothId,
            price: t.price || t.customPrice || 0,
            customPrice: t.customPrice,
            status: t.status || 'PENDIENTE',
            notes: t.notes,
            createdAt: t.createdAt
        }));

        res.json(mapped);
    } catch (e) {
        console.error("❌ GET treatments error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/patients/:patientId/treatments', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { serviceId, toothId, customPrice, status, notes } = req.body;

        if (!serviceId) {
            return res.status(400).json({ error: 'serviceId is required' });
        }

        const { data, error } = await supabase
            .from('PatientTreatment')
            .insert([{
                id: crypto.randomUUID(),
                patientId: req.params.patientId,
                serviceId,
                toothId: toothId || null,
                customPrice: customPrice || null,
                status: status || 'PENDIENTE',
                notes: notes || null,
                createdAt: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Error creating patient treatment:", error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/patients/:patientId/treatments/batch', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { treatments } = req.body;

        if (!treatments || !Array.isArray(treatments)) {
            return res.status(400).json({ error: 'treatments array is required' });
        }

        console.log('📝 Creating batch treatments:', JSON.stringify(treatments, null, 2));

        // Build insert data - serviceId is now optional, we store serviceName and price directly
        const toInsert = treatments.map(t => ({
            id: crypto.randomUUID(),
            patientId: req.params.patientId,
            serviceId: t.serviceId && !t.serviceId.startsWith('srv-') ? t.serviceId : null, // Only use real UUIDs
            serviceName: t.serviceName || 'Tratamiento',
            toothId: t.toothId || null,
            price: t.price || t.customPrice || 0,
            customPrice: t.customPrice || t.price || null,
            status: t.status || 'PENDIENTE',
            notes: t.notes || null,
            createdAt: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('PatientTreatment')
            .insert(toInsert)
            .select();

        if (error) {
            console.error("❌ Error creating batch treatments:", error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`✅ Created ${data.length} treatments`);
        res.json(data);
    } catch (e) {
        console.error("❌ Batch treatments error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/treatments/:id', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { error } = await supabase
            .from('PatientTreatment')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PAYMENTS (Sistema de cobros y monedero virtual) ---
app.post('/api/payments/create', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { patientId, budgetId, amount, method, type, notes } = req.body;

        if (!patientId || !amount || !method || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Crear registro de pago
        const paymentId = crypto.randomUUID();
        const { data: payment, error: paymentError } = await supabase
            .from('Payment')
            .insert([{
                id: paymentId,
                patientId,
                budgetId: budgetId || null,
                amount: parseFloat(amount),
                method,
                type,
                notes: notes || null,
                createdAt: new Date().toISOString()
            }])
            .select()
            .single();

        if (paymentError) {
            console.error("❌ Error creating payment:", paymentError);
            return res.status(500).json({ error: paymentError.message });
        }

        // 2. Si es ADVANCE_PAYMENT, actualizar wallet del paciente
        if (type === 'ADVANCE_PAYMENT') {
            const { data: patient } = await supabase
                .from('Patient')
                .select('wallet')
                .eq('id', patientId)
                .single();

            const currentWallet = patient?.wallet || 0;
            const newWallet = currentWallet + parseFloat(amount);

            await supabase
                .from('Patient')
                .update({ wallet: newWallet })
                .eq('id', patientId);
        }

        // 3. Si es DIRECT_CHARGE y method es 'wallet', deducir del monedero
        if (type === 'DIRECT_CHARGE' && method === 'wallet') {
            const { data: patient } = await supabase
                .from('Patient')
                .select('wallet')
                .eq('id', patientId)
                .single();

            const currentWallet = patient?.wallet || 0;
            const newWallet = currentWallet - parseFloat(amount);

            if (newWallet < 0) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            await supabase
                .from('Patient')
                .update({ wallet: newWallet })
                .eq('id', patientId);
        }

        // 4. Generar factura automáticamente
        const invoiceNumber = `F-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        let concept = '';
        let items = [];

        if (type === 'ADVANCE_PAYMENT') {
            concept = 'Pago a Cuenta';
            items = [{ name: 'Anticipo', price: parseFloat(amount) }];
        } else if (budgetId) {
            // Obtener items del presupuesto
            const { data: budget } = await supabase
                .from('Budget')
                .select('*, items:BudgetLineItem(*)')
                .eq('id', budgetId)
                .single();

            concept = `Cobro Presupuesto #${budgetId.substring(0, 6)}`;
            items = budget?.items?.map(i => ({ name: i.name, price: i.price })) || [];
        }

        const { data: invoice, error: invoiceError } = await supabase
            .from('Invoice')
            .insert([{
                id: crypto.randomUUID(),
                invoiceNumber,
                patientId,
                amount: parseFloat(amount),
                date: new Date().toISOString(),
                status: 'issued',
                paymentMethod: method,
                concept,
                relatedPaymentId: paymentId
            }])
            .select()
            .single();

        if (invoiceError) {
            console.error("❌ Error creating invoice:", invoiceError);
            // No fallar el pago si falla la factura
        }

        // 5. Crear items de factura
        if (invoice && items.length > 0) {
            const invoiceItems = items.map(item => ({
                id: crypto.randomUUID(),
                invoiceId: invoice.id,
                name: item.name,
                price: item.price
            }));

            await supabase.from('InvoiceItem').insert(invoiceItems);
        }

        // 6. Actualizar payment con invoiceId
        if (invoice) {
            await supabase
                .from('Payment')
                .update({ invoiceId: invoice.id })
                .eq('id', paymentId);
        }

        res.json({
            payment: { ...payment, invoiceId: invoice?.id },
            invoice: invoice || null
        });
    } catch (e) {
        console.error("❌ Payment creation error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/patients/:patientId/payments', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { data, error } = await supabase
            .from('Payment')
            .select('*')
            .eq('patientId', req.params.patientId)
            .order('createdAt', { ascending: false });

        if (error) {
            console.error("❌ Error fetching payments:", error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- INVOICES (Get all with enriched data) ---
app.get('/api/invoices', async (req, res) => {
    try {
        let supabase;
        try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

        const { data, error } = await supabase
            .from('Invoice')
            .select('*, items:InvoiceItem(*)')
            .order('date', { ascending: false });

        if (error) {
            console.error("❌ Error fetching invoices:", error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve static files from React app (Production Support)
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// Note: Using regex pattern for Express 5 compatibility
app.get(/^\/(?!api).*/, (req, res) => {
    // Check if file exists, if not send error (debugging)
    const indexPath = path.join(__dirname, '../dist/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error serving index.html:", err);
            res.status(500).send("Server Error: Could not serve frontend.");
        }
    });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
