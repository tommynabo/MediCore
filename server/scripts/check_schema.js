
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Prefer service role for admin tasks

if (!supabaseUrl || (!supabaseKey && !serviceRoleKey)) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function addTitleColumn() {
    console.log("Checking if 'title' column exists in 'Budget' table...");

    // Create a dummy budget to test if title works, or use RPC if available.
    // Since we can't easily alter table via JS client without SQL editor or RPC,
    // we will try to use the raw SQL via a known RPC or just inform the user.
    // BUT, we can use the 'postgres' connection if available via Prisma? NO, this is a script.

    // Better approach: Use the Supabase SQL Editor capability via API is not Standard.
    // We will assume the user has access to run SQL.

    // However, if the user calls `npx prisma db push`, it SHOULD sync.
    // Let's try to run a raw query using Prisma Client if possible?

    console.log("⚠️ This script cannot directly alter the table schema using supabase-js client.");
    console.log("⚠️ Please run 'npx prisma db push' in your terminal to sync the schema.");

    // Let's try to insert a dummy budget with title to see if it fails.
    try {
        const { data, error } = await supabase
            .from('Budget')
            .insert([{
                id: crypto.randomUUID(),
                patientId: '00000000-0000-0000-0000-000000000000', // Dummy
                title: 'Test Schema',
                status: 'DRAFT',
                totalAmount: 0,
                updatedAt: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error("❌ Error inserting with title:", error.message);
            if (error.message.includes('column "title" of relation "Budget" does not exist')) {
                console.error("🚨 CRITICAL: The 'title' column is MISSING in the database.");
                console.error("👉 Please run: npx prisma db push");
            }
        } else {
            console.log("✅ Successfully inserted budget with title. Schema seems correct.");
            // cleanup
            await supabase.from('Budget').delete().eq('title', 'Test Schema');
        }
    } catch (e) {
        console.error("Exec error:", e);
    }
}

addTitleColumn();
