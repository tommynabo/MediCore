
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parse/sync');
const dotenv = require('dotenv');

// Load Env
const envPath1 = path.join(__dirname, '../.env');
const envPath2 = path.join(__dirname, '../../server/.env');
if (fs.existsSync(envPath1)) dotenv.config({ path: envPath1 });
else if (fs.existsSync(envPath2)) dotenv.config({ path: envPath2 });

const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim() : '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const ASSETS_DIR = path.join(__dirname, '../../assets');

// --- HELPER: Date Parser ---
function parseDate(dateStr) {
    if (!dateStr) return new Date();
    // Try YYYY-MM-DD
    if (dateStr.includes('-')) return new Date(dateStr);
    // Try DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(`${y}-${m}-${d}`);
    }
    return new Date();
}

// --- 1. SPECIALTIES & TREATMENTS ---
async function importCatalog() {
    console.log("--- 1. Catalog (Specialties/Treatments) ---");
    // Specialties
    const specSet = new Set(['General']);
    try {
        const tData = fs.readFileSync(path.join(ASSETS_DIR, 'tratamientos.csv'));
        const tRecords = csv.parse(tData, { columns: true, delimiter: ';', relax_quotes: true });
        tRecords.forEach(r => { if (r.Especialidad) specSet.add(r.Especialidad.trim()); });
    } catch (e) { console.warn("No treatments csv found or error", e.message); }

    try {
        const eData = fs.readFileSync(path.join(ASSETS_DIR, 'especialidades.csv'));
        const eRecords = csv.parse(eData, { columns: true, delimiter: ',' });
        eRecords.forEach(r => { if (r.Especialidad) specSet.add(r.Especialidad.trim()); });
    } catch (e) { console.warn("No especialidades csv found", e.message); }

    const specMap = new Map(); // Name -> ID
    for (const name of specSet) {
        // Must provide ID if DB default is not set or using client-side gen
        // Try to fetch existing first to keep ID stable if possible, or upsert with explicit ID
        const { data: existing } = await supabase.from('Specialty').select('id').eq('name', name).maybeSingle();
        let id = existing ? existing.id : crypto.randomUUID();

        const { data, error } = await supabase.from('Specialty').upsert({
            id,
            name
        }, { onConflict: 'name' }).select().single();

        if (data) specMap.set(name, data.id);
        else if (error) console.error(`Error saving Specialty ${name}:`, error.message);
    }
    console.log(`Synced ${specMap.size} specialties.`);

    // Treatments
    try {
        const tData = fs.readFileSync(path.join(ASSETS_DIR, 'tratamientos.csv'));
        const tRecords = csv.parse(tData, { columns: true, delimiter: ';', relax_quotes: true });
        let count = 0;

        for (const r of tRecords) {
            const price = parseFloat((r.Importe || '0').replace(/[€\s]/g, '').replace(',', '.')) || 0;
            const specId = specMap.get(r.Especialidad?.trim()) || specMap.get('General');

            // Check existence
            const { data: existing } = await supabase.from('Treatment').select('id').eq('name', r.Servicio).maybeSingle();

            if (existing) {
                await supabase.from('Treatment').update({ price, specialtyId: specId }).eq('id', existing.id);
            } else {
                await supabase.from('Treatment').insert({
                    id: crypto.randomUUID(),
                    name: r.Servicio,
                    price,
                    specialtyId: specId
                });
            }
            count++;
        }
        console.log(`Synced ${count} treatments.`);
    } catch (e) { }
}

// --- 2. PATIENTS (Extract from Facturas + Citas) ---
const patientMap = new Map(); // LegacyID (IDCONTACTO) -> UUID

async function importPatients() {
    console.log("--- 2. Patients ---");
    const patients = new Map(); // Key: DNI (preferred) or IDCONTACTO. Value: Object

    // Load Facturas (Rich data: Address, DNI)
    try {
        const data = fs.readFileSync(path.join(ASSETS_DIR, 'facturas.csv'));
        const records = csv.parse(data, { columns: true, delimiter: ';' });
        for (const r of records) {
            if (!r['IDCONTACTO']) continue;
            const dni = r.DNI?.trim() || `LEGACY-${r.IDCONTACTO}`;
            const name = r['NOMBRE PACIENTE']?.split('(')[0].trim() || r['NOMBRE PACIENTE']; // "Name (DNI...)" cleaning

            if (!patients.has(r.IDCONTACTO)) {
                patients.set(r.IDCONTACTO, {
                    name: name,
                    dni: dni,
                    email: r.EMAIL || `missing-${r.IDCONTACTO}@clinic.com`,
                    phone: '',
                    // address: `${r.DOMICILIO || ''} ${r.POBLACION || ''}`.trim(),
                    legacyId: r.IDCONTACTO
                });
            }
        }
    } catch (e) { console.log('No facturas.csv'); }

    // Load Citas (Enrich with Phone)
    try {
        const data = fs.readFileSync(path.join(ASSETS_DIR, 'citas.csv'));
        const records = csv.parse(data, { columns: true, delimiter: ';' });
        for (const r of records) {
            if (!r.IDCONTACTO) continue;
            // Parse Phone from ASUNTO: "Kevin [600..]" or NUM_CONTACTO
            let phone = r['NUM. CONTACTO'];
            if (!phone && r.ASUNTO && r.ASUNTO.includes('[')) {
                phone = r.ASUNTO.match(/\[(.*?)\]/)?.[1];
            }

            if (patients.has(r.IDCONTACTO)) {
                const p = patients.get(r.IDCONTACTO);
                if (phone) p.phone = phone;
            } else {
                // New patient from Citas only
                patients.set(r.IDCONTACTO, {
                    name: r.ASUNTO?.split('[')[0].trim() || 'Desconocido',
                    dni: `LEGACY-${r.IDCONTACTO}`,
                    email: r.EMAIL || `missing-${r.IDCONTACTO}@clinic.com`,
                    phone: phone || '',
                    legacyId: r.IDCONTACTO
                });
            }
        }
    } catch (e) { console.log('No citas.csv'); }

    console.log(`Found ${patients.size} unique patients.`);

    // Upsert to DB
    let synced = 0;
    for (const [legacyId, p] of patients) {
        // Find by DNI or Email to avoid dups if run multiple times
        let { data: existing } = await supabase.from('Patient').select('id').or(`dni.eq.${p.dni},email.eq.${p.email}`).maybeSingle();

        // If fails or dup format, fallback to simple insert? 
        // We really want unique DNI. If DNI is LEGACY-..., it's unique per legacy ID.

        let finalId;
        if (existing) {
            finalId = existing.id;
        } else {
            const { data: newP, error } = await supabase.from('Patient').insert({
                id: crypto.randomUUID(),
                name: p.name,
                dni: p.dni,
                email: p.email,
                phone: p.phone,
                birthDate: new Date('1980-01-01').toISOString() // Placeholder required?
            }).select().single();
            if (error) {
                console.warn(`Failed patient ${p.name}:`, error.message);
                continue;
            }
            finalId = newP.id;
        }
        patientMap.set(legacyId, finalId);
        synced++;
    }
    console.log(`Synced ${synced} patients to DB.`);
}

// --- 3. APPOINTMENTS (Citas) ---
async function importAppointments() {
    console.log("--- 3. Appointments ---");
    try {
        const data = fs.readFileSync(path.join(ASSETS_DIR, 'citas.csv'));
        const records = csv.parse(data, { columns: true, delimiter: ';' });

        // Need Doctor Map? Using 'USUARIO' column -> Doctor Name
        const { data: doctors } = await supabase.from('Doctor').select('*');
        const doctorMap = new Map(); // Name -> ID
        doctors?.forEach(d => doctorMap.set(d.name.toLowerCase(), d.id));
        const defaultDoc = doctors?.[0]?.id;

        let count = 0;
        for (const r of records) {
            const patientId = patientMap.get(r.IDCONTACTO);
            if (!patientId) continue;

            const docName = r.USUARIO?.trim().toLowerCase();
            const docId = [...doctorMap.keys()].find(k => k.includes(docName)) ? doctorMap.get([...doctorMap.keys()].find(k => k.includes(docName))) : defaultDoc;

            const dateStr = r.FECHA; // YYYY-MM-DD
            const timeStr = r['HORA INICIO'];

            // Deduplicate?
            // Just insert.
            const { error } = await supabase.from('Appointment').insert({
                id: crypto.randomUUID(),
                date: new Date(dateStr).toISOString(),
                time: timeStr.slice(0, 5), // HH:MM
                patientId,
                doctorId: docId,
                status: r.ESTADO === 'Realizada' ? 'COMPLETED' : 'Scheduled',
                treatment: r.SERVICIOS || 'Consulta Importada' // Using legacy string column
            });
            if (!error) count++;
        }
        console.log(`Synced ${count} appointments.`);
    } catch (e) { console.warn(e.message); }
}

// --- 4. CLINICAL RECORDS (Historiales) ---
async function importRecords() {
    console.log("--- 4. Clinical Records ---");
    try {
        const data = fs.readFileSync(path.join(ASSETS_DIR, 'historiales.csv'));
        const records = csv.parse(data, { columns: true, delimiter: ';' });

        let count = 0;
        for (const r of records) {
            const patientId = patientMap.get(r.IDCONTACTO);
            if (!patientId) continue;

            // COMBINE EVOLUCION + HISTORIA
            const note = `[${r.HISTORIA || 'Nota'}] ${r.EVOLUCION || ''}`;
            const date = parseDate(r.FECHA); // DD/MM/YYYY? 

            // Store as structured JSON in Text column as per new schema
            const payload = {
                treatment: r.ESPECIALIDAD || 'General',
                observation: note,
                specialization: r.ESPECIALIDAD || 'General'
            };

            const { error } = await supabase.from('ClinicalRecord').insert({
                id: crypto.randomUUID(),
                patientId,
                date: date.toISOString(),
                text: JSON.stringify(payload),
                authorId: 'import'
            });
            if (!error) count++;
        }
        console.log(`Synced ${count} clinical records.`);
    } catch (e) { console.warn(e.message); }
}

// --- 5. INVOICES (Facturas) ---
async function importInvoices() {
    console.log("--- 5. Invoices (Facturas) ---");
    try {
        const data = fs.readFileSync(path.join(ASSETS_DIR, 'facturas.csv'));
        const records = csv.parse(data, { columns: true, delimiter: ';' });

        let count = 0;
        for (const r of records) {
            const patientId = patientMap.get(r.IDCONTACTO);
            if (!patientId) continue;

            const amount = parseFloat((r.IMPORTE || '0').replace(',', '.')) || 0;
            const date = parseDate(r.FECHA);

            const { error } = await supabase.from('Invoice').insert({
                id: crypto.randomUUID(),
                invoiceNumber: r.NUMERO,
                patientId,
                amount,
                date: date.toISOString(),
                status: 'paid', // Assuming historical are paid? Or check TIPO/ESTADO?
                paymentMethod: 'Cash' // Default
            });
            if (!error) count++;
            else console.error("Invoice error", r.NUMERO, error.message);
        }
        console.log(`Synced ${count} invoices.`);
    } catch (e) { console.warn(e.message); }
}

async function run() {
    console.log("Starting Master Import...");
    // 1. Catalog
    await importCatalog();
    // 2. Patients (Prerequisite for others)
    await importPatients();
    // 3. Linked Data
    await importAppointments();
    await importRecords();
    await importInvoices();
    console.log("Done!");
}

run();
