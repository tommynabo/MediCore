// Fix NULL serviceName values in PatientTreatment
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Use anon key

console.log("URL:", supabaseUrl);
console.log("Key (first 20 chars):", supabaseKey?.substring(0, 20) + "...");

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNullServiceNames() {
    console.log("🔍 Looking for PatientTreatment records with NULL serviceName...");

    const { data, error } = await supabase
        .from('PatientTreatment')
        .select('*')
        .is('serviceName', null);

    if (error) {
        console.error("❌ Error fetching:", error.message);
        return;
    }

    console.log(`Found ${data.length} records with NULL serviceName`);

    for (const record of data) {
        const newName = record.name || record.treatment || 'Tratamiento General';
        console.log(`  Updating ${record.id} -> "${newName}"`);

        const { error: updateError } = await supabase
            .from('PatientTreatment')
            .update({ serviceName: newName })
            .eq('id', record.id);

        if (updateError) {
            console.error(`  ❌ Error updating ${record.id}:`, updateError.message);
        } else {
            console.log(`  ✅ Updated ${record.id}`);
        }
    }

    console.log("✅ Done fixing NULL serviceName values");
}

fixNullServiceNames();
