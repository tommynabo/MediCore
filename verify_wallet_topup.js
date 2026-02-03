
const http = require('http');

async function verifyTopUp() {
    console.log("🧪 TESTING WALLET TOP-UP LOGIC (INVOICE -> BALANCE)");

    // Helper for requests
    const request = (path, method, body) => {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api' + path,
                method: method,
                headers: { 'Content-Type': 'application/json' }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
                    catch (e) { console.error("JSON Error", data); resolve({ status: res.statusCode, error: e }); }
                });
            });
            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    };

    try {
        // 1. Create Patient
        console.log("Creating/Fetching Patient...");
        const pRes = await request('/patients', 'POST', {
            name: "Wallet Tester",
            dni: "WT-" + Date.now(),
            birthDate: "1980-01-01",
            email: "wallet@test.com",
            wallet: 0
        });
        const patient = pRes.body;
        console.log(`Initial ID: ${patient.id}, Wallet: ${patient.wallet}`);

        // 2. Add Balance via Invoice
        const amountToAdd = 500;
        console.log(`Adding ${amountToAdd}€ via Invoice (ADVANCE_PAYMENT)...`);

        const invRes = await request('/finance/invoice', 'POST', {
            patient: patient,
            items: [{ name: 'Anticipo Test', price: amountToAdd }],
            paymentMethod: 'cash',
            type: 'ADVANCE_PAYMENT'
        });

        if (invRes.status !== 200) {
            console.error("❌ Invoice Creation Failed:", invRes.body);
            return;
        }

        console.log("✅ Invoice Created:", invRes.body.invoiceNumber);

        // 3. Check Balance via Patient GET logic (fresh)
        // Wait a sec for async triggers if any? Our code awaits `calculateWalletBalance` so it should be immediate.
        const freshPRes = await request(`/patients`, 'GET');
        const freshPatient = freshPRes.body.find(p => p.id === patient.id);

        if (freshPatient.wallet === amountToAdd) {
            console.log(`🎉 SUCCESS: Wallet updated to ${freshPatient.wallet}€`);
        } else {
            console.error(`❌ FAILURE: Wallet is ${freshPatient.wallet}€, expected ${amountToAdd}€`);
        }

    } catch (e) {
        console.error(e);
    }
}

verifyTopUp();
