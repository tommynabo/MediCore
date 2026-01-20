const axios = require('axios');

const API_KEY = "JSta9B.E5FnfZv7rRm164NnTaKLet17PwvsvsCQ";
const CID = "com_sandbox_1_9ed0e047-4306-4b22-be3d-9bc0564ddc20";

const CONFIGS = [
    // Sandbox URL (gave 403 before) - Trying Credential Swap
    {
        name: "SANDBOX_USER=CID_PASS=KEY",
        url: `https://sandbox.facturadirecta.com/api/owners/${CID}/invoices`,
        auth: 'Basic ' + Buffer.from(CID + ':' + API_KEY).toString('base64')
    },
    {
        name: "SANDBOX_USER=KEY_PASS=CID",
        url: `https://sandbox.facturadirecta.com/api/owners/${CID}/invoices`,
        auth: 'Basic ' + Buffer.from(API_KEY + ':' + CID).toString('base64')
    },
    {
        name: "SANDBOX_USER=CID_PASS=KEY (Root)",
        url: `https://sandbox.facturadirecta.com/api/invoices`,
        auth: 'Basic ' + Buffer.from(CID + ':' + API_KEY).toString('base64')
    },
    // Production URL (gave 401 before) - Trying Credential Swap
    {
        name: "PROD_USER=CID_PASS=KEY",
        url: `https://api.facturadirecta.com/owners/${CID}/invoices`,
        auth: 'Basic ' + Buffer.from(CID + ':' + API_KEY).toString('base64')
    }
];

async function testConnection() {
    console.log("🔍 Starting Credential Permutation Probe...");

    for (const conf of CONFIGS) {
        console.log(`\nTesting: [${conf.name}]`);
        try {
            // Minimal Payload
            const payload = {
                contact: { name: "Test", taxCode: "12345678Z" },
                docType: 'invoice',
                date: new Date().toISOString().split('T')[0],
                lines: [{ description: "T", quantity: 1, unitPrice: 10, tax: 21 }],
                paymentType: 'CASH',
                tags: ['crm-medico', 'test']
            };

            const res = await axios.post(conf.url, payload, {
                headers: { 'Authorization': conf.auth, 'Content-Type': 'application/json' },
                timeout: 5000
            });

            console.log("✅ SUCCESS! Working Config Found:", conf.name);
            console.log("Response:", res.data);
            return;

        } catch (error) {
            const status = error.response ? error.response.status : 'ERR';
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.log(`❌ FAILED (${status}): ${msg}`);
        }
    }
    console.log("\n❌ All probes failed.");
}

testConnection();
