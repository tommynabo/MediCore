const axios = require('axios');

const API_URL = process.env.WA_API_URL;
const GLOBAL_API_KEY = process.env.WA_GLOBAL_API_KEY; // Used for management
const INSTANCE_KEY = process.env.WA_INSTANCE_KEY;     // Used for sending messages
const INSTANCE_NAME = process.env.WA_INSTANCE_NAME;

let status = 'DISCONNECTED';

const safeInstanceName = encodeURIComponent(INSTANCE_NAME);

/**
 * Helper to get headers for request
 * Evolution API usually acceptsapikey for instance operations, 
 * or global apikey for management. 
 * For sending messages, we use the Instance Key.
 */
const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'apikey': INSTANCE_KEY // The API Key for the specific instance
    };
};

// Also usually Global Key is needed for checking instance status if not using instance key
const getGlobalHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
    };
};

const initialize = async () => {
    console.log('🔄 Checking Evolution API Connection...');

    if (!API_URL || !INSTANCE_NAME || !INSTANCE_KEY) {
        console.error('❌ Missing Evolution API Configuration (URL, Name or Key). Service disabled.');
        status = 'DISABLED';
        return;
    }

    try {
        // Check connection state
        // Endpoint: /instance/connectionState/{instance}
        const response = await axios.get(
            `${API_URL}/instance/connectionState/${safeInstanceName}`,
            { headers: getHeaders() } // Can often use instance key too, or global
        );

        const connectionState = response.data?.instance?.state || response.data?.state;
        console.log(`📡 Evolution API State for ${INSTANCE_NAME}:`, connectionState);

        if (connectionState === 'open') {
            status = 'READY';
            qrCodeData = null;
        } else if (connectionState === 'connecting') {
            status = 'INITIALIZING';
        } else {
            status = 'DISCONNECTED';
            // Try to fetch QR code
            try {
                const qrResponse = await axios.get(
                    `${API_URL}/instance/connect/${safeInstanceName}`,
                    { headers: getHeaders() }
                );
                if (qrResponse.data && qrResponse.data.base64) {
                    qrCodeData = qrResponse.data.base64;
                    // Ensure it has data URI prefix if missing
                    if (!qrCodeData.startsWith('data:image')) {
                        qrCodeData = `data:image/png;base64,${qrCodeData}`;
                    }
                }
            } catch (qrError) {
                console.warn('⚠️ Could not fetch QR code:', qrError.message);
            }
        }

    } catch (error) {
        console.warn('⚠️ Could not connect to Evolution API instance:', error.message);
        console.warn('Details:', error.response?.data || error.code);
        status = 'ERROR';
    }
};

const getStatus = () => {
    return { status, qrCode: qrCodeData, provider: 'Evolution API' };
};

const sendMessage = async (to, message) => {
    if (status === 'DISABLED') {
        throw new Error('WhatsApp service not configured.');
    }

    try {
        // Evolution API v2 format usually needs remoteJid or number
        // Format number: remove + and ensure country code. 
        // Evolution API is smart but standardizing is good.
        // Assuming 'to' comes as "123456789" or "34123456789"

        // Remove non-digits
        let number = to.replace(/[^0-9]/g, '');

        // Basic Spain rule (likely user context) - add 34 if length is 9
        if (number.length === 9) {
            number = '34' + number;
        }

        const payload = {
            number: number,
            text: message, // or "options": { "delay": 1200, "presence": "composing" }
            options: {
                delay: 1200,
                presence: "composing"
            }
        };

        // Endpoint: /message/sendText/{instance}
        const url = `${API_URL}/message/sendText/${safeInstanceName}`;

        console.log(`📤 Sending WA to ${number} via Evolution API...`);

        const response = await axios.post(url, payload, { headers: getHeaders() });

        console.log('✅ WA Message Sent:', response.data);
        return { success: true, data: response.data };

    } catch (error) {
        console.error('❌ Error sending WhatsApp message via Evolution API:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
        throw new Error('Failed to send WhatsApp message via API');
    }
};

const logout = async () => {
    // Evolution API: Logout instance
    try {
        await axios.delete(
            `${API_URL}/instance/logout/${safeInstanceName}`,
            { headers: getHeaders() }
        );
        status = 'DISCONNECTED';
        return { success: true };
    } catch (e) {
        console.error('Logout failed:', e.message);
        return { success: false, error: e.message };
    }
};

module.exports = {
    initialize,
    getStatus,
    sendMessage,
    logout
};
