const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createInvoice, getInvoiceUrls, downloadPdf, getOrCreateContact } = require('../services/quipuService');
const fs = require('fs');

async function testDownload() {
    console.log("🚀 Testing Authenticated PDF Download...");

    try {
        // 1. Get/Create Contact
        const patientData = {
            name: `Download Test ${Date.now()}`,
            tax_id: `999${Math.floor(Math.random() * 1000)}X`
        };
        const contact = await getOrCreateContact(patientData);
        if (!contact) throw new Error("Contact failed");

        // 2. Create Invoice
        const items = [{ name: "Test Service", price: 10, quantity: 1 }];
        const today = new Date().toISOString().split('T')[0];
        const inv = await createInvoice(contact.id, items, today, today, 'cash');

        if (!inv.success) throw new Error("Invoice creation failed");
        console.log(`✅ Invoice Created: ${inv.id}`);

        // 3. Get URL
        const urls = await getInvoiceUrls(inv.id);
        console.log(`🔗 Download URL: ${urls.download}`);

        // 4. Try Download
        console.log("⬇️  Attempting download...");
        const stream = await downloadPdf(urls.download);

        const outFile = path.join(__dirname, 'test_invoice.pdf');
        const writer = fs.createWriteStream(outFile);

        stream.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log("✅ Download finished. Verifying file...");
        const content = fs.readFileSync(outFile);
        if (content.toString().startsWith('%PDF')) {
            console.log("🎉 SUCCESS: File is a valid PDF!");
        } else {
            console.error("❌ ERROR: File is NOT a PDF. Content preview:");
            console.log(content.slice(0, 100).toString());
        }

    } catch (e) {
        console.error("💥 FAILED:", e);
    }
}

testDownload();
