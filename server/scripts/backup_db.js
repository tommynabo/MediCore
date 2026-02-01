const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
    console.log('📦 Starting Database Backup (V1)...');
    const backupData = {};

    try {
        // Fetch all data from known models
        // Note: We accept that some tables might be empty or models might change. 
        // We use $queryRaw to get table names or just explicit list from schema.
        // Explicit list is safer with Prisma.

        const models = [
            'User', 'Patient', 'Specialty', 'Doctor', 'Treatment',
            'PatientTreatment', 'Appointment', 'Liquidation', 'Payment',
            'Invoice', 'InvoiceItem', 'TreatmentPlan', 'Installment',
            'Budget', 'BudgetLineItem', 'ClinicalRecord', 'InventoryItem',
            'DocumentTemplate', 'Odontogram', 'DentalSnapshot',
            'WhatsAppTemplate', 'WhatsAppLog'
        ];

        for (const model of models) {
            // Prisma client model names are usually lowercase in property access (prisma.user)
            const modelName = model.charAt(0).toLowerCase() + model.slice(1);
            if (prisma[modelName]) {
                console.log(`Extracting ${model}...`);
                backupData[model] = await prisma[modelName].findMany();
            } else {
                console.warn(`⚠️ Model ${model} not found in Prisma Client.`);
            }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `../CRM_MEDICO_V1_DB_BACKUP_${timestamp}.json`;

        fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup saved to ${filename}`);

    } catch (e) {
        console.error('❌ Backup failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
