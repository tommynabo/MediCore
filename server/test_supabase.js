// Test Supabase Connection and Payment Table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    console.log('🔍 Testing Supabase Connection...');
    console.log('URL:', process.env.SUPABASE_URL);

    // Test 1: Check Patient table (known to exist)
    console.log('\n1️⃣ Testing Patient table...');
    const { data: patients, error: patientError } = await supabase
        .from('Patient')
        .select('id, name')
        .limit(1);

    if (patientError) {
        console.error('❌ Patient error:', patientError);
    } else {
        console.log('✅ Patient table exists:', patients);
    }

    // Test 2: Check Payment table
    console.log('\n2️⃣ Testing Payment table...');
    const { data: payments, error: paymentError } = await supabase
        .from('Payment')
        .select('*')
        .limit(1);

    if (paymentError) {
        console.error('❌ Payment error:', paymentError);
        console.log('\n📋 Payment table DOES NOT EXIST or is not accessible');
    } else {
        console.log('✅ Payment table exists:', payments);
    }

    // Test 3: Try to create Payment table
    console.log('\n3️⃣ Attempting to create Payment table via SQL...');
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
        sql: `
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL REFERENCES "Patient"("id"),
  "budgetId" TEXT,
  "amount" FLOAT NOT NULL,
  "method" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "invoiceId" TEXT UNIQUE,
  "notes" TEXT
);`
    });

    if (createError) {
        console.error('❌ Create error:', createError);
        console.log('\n⚠️  RPC method not available. User must run SQL manually in Supabase SQL Editor.');
    } else {
        console.log('✅ Create successful');
    }
}

test().catch(console.error);
