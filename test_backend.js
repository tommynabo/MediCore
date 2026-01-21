
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const PATIENT_ID = 'e207b62c-847e-41df-a521-86566270404a'; // Replace with a valid ID if needed, checking console logs later

async function testClinicalRecord() {
    console.log("Testing POST /clinical-records...");
    try {
        const res = await axios.post(`${BASE_URL}/clinical-records`, {
            patientId: PATIENT_ID, // We'll need a real ID, but let's see if we get 500 or 400 first
            treatment: "TEST TREATMENT",
            observation: "TEST OBSERVATION",
            specialization: "General",
            date: new Date().toISOString()
        });
        console.log("✅ Clinical Record Success:", res.status, res.data);
    } catch (e) {
        console.error("❌ Clinical Record Failed:", e.response ? e.response.data : e.message);
    }
}

async function testBudget() {
    console.log("Testing POST /patients/:id/budgets...");
    try {
        const res = await axios.post(`${BASE_URL}/patients/${PATIENT_ID}/budgets`, {
            items: [
                { name: "Test Item", price: 100, quantity: 1 }
            ]
        });
        console.log("✅ Budget Success:", res.status, res.data);
    } catch (e) {
        console.error("❌ Budget Failed:", e.response ? e.response.data : e.message);
    }
}

// First fetch a patient to get a valid ID
async function run() {
    try {
        console.log("Fetching patients to get an ID...");
        const { data: patients } = await axios.get(`${BASE_URL}/patients`);
        if (patients.length > 0) {
            const pid = patients[0].id;
            console.log("Using Patient ID:", pid);

            // Override ID for tests
            await axios.post(`${BASE_URL}/clinical-records`, {
                patientId: pid,
                treatment: "TEST TREATMENT",
                observation: "TEST OBSERVATION",
                specialization: "General",
                date: new Date().toISOString()
            }).then(r => console.log("✅ Record Created", r.data))
                .catch(e => console.error("❌ Record Error", e.response?.data || e.message));

            await axios.post(`${BASE_URL}/patients/${pid}/budgets`, {
                items: [{ name: "Test Budg Item", price: 50 }]
            }).then(r => console.log("✅ Budget Created", r.data))
                .catch(e => console.error("❌ Budget Error", e.response?.data || e.message));

        } else {
            console.error("No patients found to test with.");
        }
    } catch (e) {
        console.error("❌ Failed to connect to backend:", e.message);
    }
}

run();
