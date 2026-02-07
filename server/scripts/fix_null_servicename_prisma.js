// Fix NULL serviceName values using Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNullServiceNames() {
    console.log("🔍 Looking for PatientTreatment records with NULL serviceName...");

    try {
        const records = await prisma.$queryRaw`
            SELECT * FROM "PatientTreatment" WHERE "serviceName" IS NULL
        `;

        console.log(`Found ${records.length} records with NULL serviceName`);

        for (const record of records) {
            const newName = 'Tratamiento General';
            console.log(`  Updating ${record.id} -> "${newName}"`);

            await prisma.$executeRaw`
                UPDATE "PatientTreatment" SET "serviceName" = ${newName} WHERE id = ${record.id}
            `;
            console.log(`  ✅ Updated ${record.id}`);
        }

        console.log("✅ Done fixing NULL serviceName values");
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixNullServiceNames();
