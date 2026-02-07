const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { getOrCreateContact, createInvoice, getInvoicePdf, getInvoiceUrls } = require('../services/quipuService');

async function testQuipu() {
    console.log("🚀 Testing Quipu Integration (OAuth Flow)...");

    // Debug ENV loading
    if (!process.env.QUIPU_APP_ID) {
        console.error("❌ CRITICAL: QUIPU_APP_ID Not Found in ENV:", process.env.QUIPU_APP_ID);
        console.log("Current Dir:", __dirname);
        return;
    }

    try {
        console.log("1️⃣ Testing Contact Logic...");

        const randomId = Math.floor(Math.random() * 1000);
        const patientData = {
            name: `Paciente Test Agente ${randomId}`,
            tax_id: `999${randomId}X`,
            email: `test${randomId}@example.com`,
            address: "Calle de la Prueba 123",
            city: "Madrid",
            zip_code: "28001"
        };

        console.log(`   Creating/Finding contact: ${patientData.name}`);
        const contactRes = await getOrCreateContact(patientData);

        // Quipu response structure check
        if (!contactRes) throw new Error("Contact Response is null/undefined");

        // Usually JSON API returns { data: { id, attributes } } or just properties depending on client implementation
        // My service returns response.data
        const contactId = contactRes.id || contactRes.data?.id;

        if (!contactId) {
            console.error("❌ Invalid Contact Response Structure:", JSON.stringify(contactRes, null, 2));
            return;
        }

        console.log(`✅ Contact Ready ID: ${contactId}`);

        console.log("2️⃣ Testing Invoice Creation...");
        const items = [
            { name: "Limpieza Dental Completa", price: 60.50, quantity: 1, tax: 0 }
        ];
        const today = new Date().toISOString().split('T')[0];

        const invoiceRes = await createInvoice(contactId, items, today, today, 'cash');

        if (invoiceRes.success) {
            console.log(`✅ Invoice Created! ID: ${invoiceRes.id}`);

            console.log("3️⃣ Fetching URLs (Download + Preview)...");
            const urls = await getInvoiceUrls(invoiceRes.id);
            if (urls) {
                console.log(`📜 Download URL: ${urls.download}`);
                console.log(`👁 Preview URL: ${urls.preview}`);
                console.log("\n🎉 TEST COMPLETED SUCCESSFULLY!");
            } else {
                console.warn("⚠️ URLs not available.");
            }
        } else {
            console.error("❌ Failed to create invoice:", invoiceRes.error);
        }

    } catch (error) {
        console.error("\n💥 Critical Test Error:", error.response?.data || error);
    }
}

testQuipu();
