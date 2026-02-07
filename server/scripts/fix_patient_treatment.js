const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting Schema Fix (Round 2)...");

    try {
        // Add Price Column (Re-run for safety)
        await prisma.$executeRawUnsafe(`ALTER TABLE "PatientTreatment" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;`);
        console.log("✅ 'price' column confirmed.");

        // Add Custom Price Column (Re-run for safety)
        await prisma.$executeRawUnsafe(`ALTER TABLE "PatientTreatment" ADD COLUMN IF NOT EXISTS "customPrice" DOUBLE PRECISION DEFAULT 0;`);
        console.log("✅ 'customPrice' column confirmed.");

        // Add Service Name Column (New Fix)
        await prisma.$executeRawUnsafe(`ALTER TABLE "PatientTreatment" ADD COLUMN IF NOT EXISTS "serviceName" TEXT;`);
        console.log("✅ 'serviceName' column confirmed.");

        // Attempt to reload Supabase Schema Cache
        try {
            await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload config';`);
            console.log("✅ Schema cache reloaded.");
        } catch (e) {
            console.warn("⚠️ Could not reload schema cache (check permissions):", e.message);
        }

    } catch (e) {
        console.error("❌ Error executing schema fix:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
