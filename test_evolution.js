require('dotenv').config();
const whatsappService = require('./server/services/whatsappService');

(async () => {
    console.log('Testing Evolution API Integration...');
    await whatsappService.initialize();

    const status = whatsappService.getStatus();
    console.log('Current Service Status:', status);

    if (status.status === 'READY' || status.status === 'INITIALIZING') {
        console.log('✅ Connection appears successful (State is READY, OPEN or CONNECTING)');
    } else {
        console.error('❌ Service status is', status.status);
        if (status.qrCode) {
            console.log('✅ QR Code Data is present (Length: ' + status.qrCode.length + ')');
            console.log('Sample:', status.qrCode.substring(0, 50) + '...');
        } else {
            console.warn('⚠️ No QR Code returned. Check if Evolution API connect endpoint is reachable.');
        }
    }
})();
