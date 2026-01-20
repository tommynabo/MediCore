const axios = require('axios');

const API_KEY = "JSta9B.E5FnfZv7rRm164NnTaKLet17PwvsvsCQ";
const CID = "com_sandbox_1_9ed0e047-4306-4b22-be3d-9bc0564ddc20";

const CONFIGS = [
    // Spec-compliant: CID in path, custom header
    {
        name: "APP_CID_HEADER",
        url: `https://app.facturadirecta.com/api/${CID}/invoices`,
        headers: { 'facturadirecta-api-key': API_KEY }
    },
    // Backwards compat attempt (maybe Basic Auth still works?)
    {
        name: "APP_CID_BASIC",
        url: `https://app.facturadirecta.com/api/${CID}/invoices`,
        auth: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
    }
];

async function getOrCreateContact(config) {
    const contactData = {
        content: {
            type: 'contact',
            main: {
                name: "Tomas Navarro Sardà",
                fiscalId: "23878160C",
                currency: "EUR",
                country: "ES",
                address: "C/ Test 123",
                zipcode: "08022",
                city: "Barcelona",
                email: "tomasnivraone@gmail.com",
                accounts: {
                    client: "430000" // Standard generic client account (6 digits required)
                }
            }
        }
    };

    try {
        // 1. Try to find existing
        console.log(`🔎 Searching contact [${contactData.content.main.fiscalId}]...`);
        const searchUrl = config.url.replace('/invoices', '/contacts') + `?fiscalId=${contactData.content.main.fiscalId}`;
        const searchRes = await axios.get(searchUrl, { headers: config.headers, timeout: 5000 });

        if (searchRes.data.items && searchRes.data.items.length > 0) {
            console.log(`✅ Found existing contact data:`, JSON.stringify(searchRes.data.items[0]));
            // Try explicit property access based on log
            return searchRes.data.items[0].content?.uuid;
        }

        // 2. Create if not found
        console.log(`➕ Creating new contact...`);
        const createUrl = config.url.replace('/invoices', '/contacts');
        const createRes = await axios.post(createUrl, contactData, { headers: config.headers, timeout: 5000 });
        console.log(`✅ Created contact response:`, JSON.stringify(createRes.data));
        // The API might return the ID in a different place?
        // Response schema: { content: { ... }, tags: ... }
        return createRes.data.content?.id || createRes.data.id;

    } catch (error) {
        console.error("❌ Contact Step Failed:", error.response?.data || error.message);
        throw error;
    }
}

async function testConnection() {
    console.log("🔍 Testing with Contact ID Flow...");

    for (const conf of CONFIGS) {
        if (!conf.headers) continue; // Skip Basic Auth legacy config

        console.log(`\nTesting: [${conf.name}]`);
        try {
            // Step 1: Get Contact ID
            const contactId = await getOrCreateContact(conf);
            if (!contactId) throw new Error("Could not retrieve Contact ID");

            // Step 2: Create Invoice
            const invoicePayload = {
                content: {
                    type: 'invoice',
                    main: {
                        docNumber: { series: "TEST" }, // REQUIRED
                        date: new Date().toISOString().split('T')[0],
                        currency: "EUR",
                        contact: contactId, // UUID String
                        lines: [{
                            text: "Consulta Médica",
                            quantity: 1,
                            unitPrice: 100,
                            tax: ["S_IVA_21"]
                        }]
                        // paymentType REMOVED
                    }
                }
            };

            const res = await axios.post(conf.url, invoicePayload, {
                headers: conf.headers,
                timeout: 8000
            });

            console.log("✅ SUCCESS! Invoice Issued.");
            console.log("DEBUG RESPONSE:", JSON.stringify(res.data, null, 2));
            const invId = res.data.content?.id || res.data.id;
            console.log("Invoice ID:", invId);
            console.log("Full Response Keys:", Object.keys(res.data));

            // 3. Generate PDF Link (PUT /invoices/:id/pdf)
            console.log("📄 Generating PDF Link...");
            const pdfUrl = conf.url + `/${res.data.content.id}/pdf`;
            const pdfRes = await axios.put(pdfUrl, {}, { headers: conf.headers });
            console.log("✅ PDF Response:", JSON.stringify(pdfRes.data, null, 2));

            return; // Stop on success

        } catch (error) {
            const status = error.response ? error.response.status : 'ERR';
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.log(`❌ Invoice Step Failed (${status}): ${msg}`);
        }
    }
}


testConnection();
