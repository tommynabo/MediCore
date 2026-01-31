const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let client;
let qrCodeData = null;
let status = 'DISCONNECTED'; // DISCONNECTED, QR_READY, AUTHENTICATED, READY

const initialize = () => {
    console.log('🔄 Initializing WhatsApp Client...');

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        }
    });

    client.on('qr', async (qr) => {
        console.log('📸 WhatsApp QR Code received');
        try {
            qrCodeData = await qrcode.toDataURL(qr);
            status = 'QR_READY';
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Client is ready!');
        status = 'READY';
        qrCodeData = null;
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp Authenticated');
        status = 'AUTHENTICATED';
        qrCodeData = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp Auth Failure:', msg);
        status = 'DISCONNECTED';
    });

    client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp Disconnected:', reason);
        status = 'DISCONNECTED';
        client = null;
        // Optional: Auto-reconnect logic could go here
    });

    client.initialize();
};

const getStatus = () => {
    return { status, qrCode: qrCodeData };
};

const logout = async () => {
    if (client) {
        await client.logout();
        client = null;
        status = 'DISCONNECTED';
        qrCodeData = null;
    }
    return { success: true };
};

const sendMessage = async (to, message) => {
    if (status !== 'READY') {
        throw new Error('WhatsApp client is not ready. Please scan QR code in Settings.');
    }

    try {
        // whatsapp-web.js expects numbers in format '1234567890@c.us'
        // We need to sanitize the number. Assuming international format without + or 00
        // Ideally, stored phones should be normalized. Here we do basic cleaning.
        let chatId = to.replace(/[^0-9]/g, '');

        // Basic check for Spain length (9 digits) -> Add prefix 34
        // Logic: if length is 9, assume ES (+34). If > 9, assume it has prefix.
        if (chatId.length === 9) {
            chatId = '34' + chatId;
        }

        chatId = chatId + '@c.us';

        const response = await client.sendMessage(chatId, message);
        return { success: true, response };
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};

module.exports = {
    initialize,
    getStatus,
    sendMessage,
    logout
};
