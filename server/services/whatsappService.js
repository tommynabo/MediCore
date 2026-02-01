let Client, LocalAuth;
const qrcode = require('qrcode');

let client;
let qrCodeData = null;
let status = 'DISCONNECTED'; // DISCONNECTED, QR_READY, AUTHENTICATED, READY, DISABLED

const initialize = () => {
    console.log('🔄 Initializing WhatsApp Client...');

    try {
        // LAZY LOAD to avoid Vercel/Serverless crashes
        const wwebjs = require('whatsapp-web.js');
        Client = wwebjs.Client;
        LocalAuth = wwebjs.LocalAuth;
    } catch (e) {
        console.warn('⚠️ WhatsApp Web JS not found or failed to load. Service disabled (likely Vercel environment).');
        status = 'DISABLED';
        return;
    }

    try {
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
        });

        client.initialize();
    } catch (initError) {
        console.error('❌ WhatsApp Client Init Failed:', initError);
        status = 'DISABLED';
    }
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
    if (status === 'DISABLED') {
        throw new Error('WhatsApp service is disabled in this environment.');
    }
    if (status !== 'READY') {
        throw new Error('WhatsApp client is not ready. Please scan QR code in Settings.');
    }

    try {
        // whatsapp-web.js expects numbers in format '1234567890@c.us'
        let chatId = to.replace(/[^0-9]/g, '');

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
