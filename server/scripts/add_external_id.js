const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("🔄 Running migration: Adding 'externalId' to 'Invoice' table...");

        // Use raw SQL to alter table safely without touching other tables
        const result = await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "externalId" TEXT;`);

        console.log(`✅ Migration executed. Result: ${result}`);
        console.log("The 'externalId' column (TEXT) is now available in 'Invoice'.");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
