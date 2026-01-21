const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Adjust path to .env if needed

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../assets/facturas.csv');

const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const SUPABASE_URL = rawUrl ? rawUrl.replace(/"/g, '').trim() : null;
const SUPABASE_KEY = rawKey ? rawKey.replace(/"/g, '').trim() : null;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importInvoices() {
    console.log('Starting invoice import...');

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`Error: CSV file not found at ${CSV_FILE_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, '')); // Strip quotes

    console.log(`Found ${lines.length - 1} rows to process.`);

    let successCount = 0;
    let failCount = 0;

    // Helper to find column index case-insensitively
    const getColIndex = (name) => headers.findIndex(h => h.trim().toUpperCase() === name.toUpperCase());

    const colDNI = getColIndex('DNI');
    const colName = getColIndex('NOMBRE PACIENTE'); // Adjust based on actual CSV header
    const colNum = getColIndex('NUMERO');
    const colImporte = getColIndex('IMPORTE');
    const colFecha = getColIndex('FECHA');

    console.log('Column mapping:', { DNI: colDNI, Name: colName, Num: colNum, Amount: colImporte, Date: colFecha });

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';');
        const dni = cols[colDNI]?.trim();
        const name = cols[colName]?.trim();
        const invoiceNum = cols[colNum]?.trim();
        const amountStr = cols[colImporte]?.trim();
        const dateStr = cols[colFecha]?.trim();

        if (!dni && !name) {
            console.warn(`Row ${i}: Missing DNI and Name. Skipping.`);
            failCount++;
            continue;
        }

        try {
            // Find patient
            let { data: patients, error: pError } = await supabase
                .from('Patient')
                .select('id, name')
                .or(`dni.eq.${dni},name.eq.${name}`); // Try match by DNI or Name

            if (pError) throw pError;

            let patientId = null;
            if (patients && patients.length > 0) {
                patientId = patients[0].id; // Pick first match
                // console.log(`Matched patient: ${patients[0].name} for invoice ${invoiceNum}`);
            } else {
                // Optional: Create patient if not exists? For now, we just skip or log.
                // console.warn(`Row ${i}: Patient not found (${name}, ${dni}). Skipping invoice.`);
                // failCount++;
                // continue;

                // Better approach for legacy: Maybe we can't link it, but we can't create bad data.
                // Let's Log it.
                console.warn(`Row ${i}: Patient not found (${name}, ${dni}). Skipping.`);
                failCount++;
                continue;
            }

            // Parse Date (DD/MM/YYYY to YYYY-MM-DD)
            const [day, month, year] = dateStr.split('/');
            const isoDate = `${year}-${month}-${day}`;

            // Parse Amount (1.200,50 -> 1200.50)
            const amount = parseFloat(amountStr.replace('.', '').replace(',', '.'));

            // Check if invoice exists
            const { data: existing, error: eError } = await supabase
                .from('Invoice')
                .select('id')
                .eq('invoiceNumber', invoiceNum)
                .single();

            if (existing) {
                // console.log(`Invoice ${invoiceNum} already exists. Skipping.`);
                continue;
            }

            // Insert Invoice
            const { error: iError } = await supabase
                .from('Invoice')
                .insert({
                    patientId: patientId,
                    invoiceNumber: invoiceNum,
                    amount: amount,
                    date: new Date(isoDate),
                    status: 'PAID', // Assuming legacy invoices are paid
                    paymentMethod: 'legacy',
                    type: 'invoice',
                    items: [{ name: 'Importación Histórica', price: amount }] // Dummy item
                });

            if (iError) throw iError;

            console.log(`Imported invoice ${invoiceNum} for ${patients[0].name}`);
            successCount++;

        } catch (err) {
            console.error(`Error processing row ${i}:`, err.message);
            failCount++;
            if (err.message.includes('Invalid API key') && failCount > 5) {
                console.error("Aborting: Too many Auth errors.");
                process.exit(1);
            }
        }
    }

    console.log(`Import finished. Success: ${successCount}, Failed/Skipped: ${failCount}`);
}

importInvoices();
