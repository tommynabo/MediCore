
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, './server/.env');
dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`URL: ${url}`);
console.log(`Key length: ${key ? key.length : 0}`);

if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Attempting to select from Patient table...");
    const { data, error } = await supabase.from('Patient').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Connection Failed:", error);
    } else {
        console.log("Connection Success!");
    }
}

check();
