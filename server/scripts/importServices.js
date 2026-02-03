/**
 * Import Services from CSV to Supabase
 * Run with: node server/scripts/importServices.js
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse European price format: "180,00 €" -> 180.00
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    // Remove € symbol and spaces, replace comma with dot
    const cleaned = priceStr.replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

// Parse percentage: "0,00 %" -> 0.00
function parsePercent(percentStr) {
    if (!percentStr) return 0;
    const cleaned = percentStr.replace('%', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

async function importServices() {
    console.log('📦 Starting services import...\n');

    // Read CSV file
    const csvPath = path.join(__dirname, '../../assets/listado_servicios_completo.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Parse header
    const header = lines[0].split(';');
    console.log('📋 CSV Headers:', header.join(', '));

    // Parse services
    const services = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        if (values.length < 18) continue;

        const service = {
            external_id: values[1]?.trim(),
            name: values[2]?.trim(),
            specialty_id: values[3]?.trim(),
            specialty_name: values[4]?.trim(),
            specialty_color: values[9]?.trim() || '#3b638e',
            duration_min: parseInt(values[10]) || 30,
            base_price: parsePrice(values[14]),
            discount_percent: parsePercent(values[15]),
            tax_percent: parsePercent(values[16]),
            final_price: parsePrice(values[17]),
            is_active: values[0]?.trim() === 'Activo',
            odontogram_type: values[13]?.trim() || 'Color servicio'
        };

        services.push(service);
    }

    console.log(`\n✅ Parsed ${services.length} services from CSV\n`);

    // Group by specialty for summary
    const bySpecialty = {};
    services.forEach(s => {
        if (!bySpecialty[s.specialty_name]) bySpecialty[s.specialty_name] = [];
        bySpecialty[s.specialty_name].push(s);
    });

    console.log('📊 Services by Specialty:');
    Object.entries(bySpecialty).forEach(([specialty, items]) => {
        console.log(`   ${specialty}: ${items.length} services`);
    });

    // Clear existing services (optional - comment out if you want to keep existing)
    console.log('\n🗑️  Clearing existing services...');
    const { error: deleteError } = await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError && !deleteError.message.includes('no rows')) {
        console.error('Warning during delete:', deleteError.message);
    }

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < services.length; i += batchSize) {
        const batch = services.slice(i, i + batchSize);
        const { data, error } = await supabase.from('services').insert(batch).select();

        if (error) {
            console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
            errors += batch.length;
        } else {
            inserted += data.length;
            console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${data.length} services)`);
        }
    }

    console.log('\n========================================');
    console.log(`🎉 Import complete!`);
    console.log(`   ✅ Inserted: ${inserted} services`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('========================================\n');
}

importServices().catch(console.error);
