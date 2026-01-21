
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parse/sync');
const dotenv = require('dotenv');

const envPath1 = path.join(__dirname, '../.env');
const envPath2 = path.join(__dirname, '../../server/.env');
const envPath3 = path.join(__dirname, '../../.env');

if (fs.existsSync(envPath1)) dotenv.config({ path: envPath1 });
else if (fs.existsSync(envPath2)) dotenv.config({ path: envPath2 });
else if (fs.existsSync(envPath3)) dotenv.config({ path: envPath3 });

const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
console.log("Testing with ANON KEY...");

console.log("Supabase URL present:", !!supabaseUrl);
console.log("Supabase Key present:", !!supabaseKey);
if (supabaseKey) {
    console.log("Key starts with:", supabaseKey.charAt(0));
    console.log("Key ends with:", supabaseKey.charAt(supabaseKey.length - 1));
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Credentials from .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ASSETS_DIR = path.join(__dirname, '../../assets');

async function importSpecialties() {
    console.log("Importing Specialties from treatments file + explicit file...");
    const specialtiesSet = new Set(['General']); // Default

    // 1. Gather from tratamientos.csv (it has 'Especialidad' column)
    const treatData = fs.readFileSync(path.join(ASSETS_DIR, 'tratamientos.csv'));
    const treatRecords = csv.parse(treatData, { columns: true, delimiter: ';', relax_quotes: true });

    treatRecords.forEach(r => {
        if (r.Especialidad) specialtiesSet.add(r.Especialidad.trim());
    });

    // 2. Gather from especialidades.csv
    // Header: Usuario,Especialidad
    const espData = fs.readFileSync(path.join(ASSETS_DIR, 'especialidades.csv'));
    const espRecords = csv.parse(espData, { columns: true, delimiter: ',' }); // Looks like comma from head output

    espRecords.forEach(r => {
        if (r.Especialidad) specialtiesSet.add(r.Especialidad.trim());
    });

    console.log(`Found ${specialtiesSet.size} unique specialties.`);

    for (const name of specialtiesSet) {
        if (!name) continue;
        const { error } = await supabase.from('Specialty').upsert({
            name: name,
            description: 'Imported from CSV'
        }, { onConflict: 'name' });
        if (error) console.error("Error specialty:", name, error.message);
    }
}

async function linkDoctorsToSpecialties() {
    console.log("Linking Doctors based on especialidades.csv...");
    const data = fs.readFileSync(path.join(ASSETS_DIR, 'especialidades.csv'));
    const records = csv.parse(data, { columns: true, delimiter: ',' });

    const { data: doctors } = await supabase.from('Doctor').select('*');
    const { data: specialties } = await supabase.from('Specialty').select('*');

    if (!doctors) return;

    for (const r of records) {
        const docName = r.Usuario;
        const specName = r.Especialidad;
        if (!docName || !specName) continue;

        const doc = doctors.find(d => d.name.toLowerCase().includes(docName.toLowerCase()));
        const spec = specialties.find(s => s.name.toLowerCase() === specName.toLowerCase());

        if (doc && spec) {
            await supabase.from('Doctor').update({ specialtyId: spec.id }).eq('id', doc.id);
            console.log(`Linked Dr. ${doc.name} to ${spec.name}`);
        }
    }
}

async function importTreatments() {
    console.log("Importing Treatments...");
    const data = fs.readFileSync(path.join(ASSETS_DIR, 'tratamientos.csv'));
    // Handle potential BOM or encoding if needed, usually csv-parse handles utf8
    const records = csv.parse(data, {
        columns: true,
        delimiter: ';',
        relax_quotes: true,
        skip_empty_lines: true
    });

    const { data: specialties, error: specError } = await supabase.from('Specialty').select('*');
    if (specError || !specialties) {
        console.error("Failed to load specialties for reference:", specError);
        return;
    }

    let count = 0;
    for (const r of records) {
        // Name: Servicio
        // Price: Importe ("180,00 €")
        // Spec: Especialidad

        const rawPrice = r.Importe || '0';
        // Clean price: Remove € and spaces, replace comma with dot
        const priceClean = rawPrice.replace(/[€\s]/g, '').replace(',', '.');
        const price = parseFloat(priceClean) || 0;

        const specName = r.Especialidad ? r.Especialidad.trim() : 'General';
        const spec = specialties.find(s => s.name === specName) || specialties.find(s => s.name === 'General');

        // Actually, let's use check-then-insert/update
        const { data: existing } = await supabase.from('Treatment').select('id').eq('name', r.Servicio).maybeSingle();

        if (existing) {
            await supabase.from('Treatment').update({
                price,
                specialtyId: spec ? spec.id : null
            }).eq('id', existing.id);
        } else {
            await supabase.from('Treatment').insert({
                name: r.Servicio,
                price,
                specialtyId: spec ? spec.id : null
            });
        }
        count++;
    }
    console.log(`Processed ${count} treatments.`);
}

// ... Additional imports for patients/histories would go here if mapped fanatically
// For now implementing the core Specialty/Doctor/Treatment link as per plan pt 1 & 2 logic.

async function run() {
    await importSpecialties();
    await linkDoctorsToSpecialties();
    await importTreatments();
}

run();
