const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting Schema Fix (Round 3 - FK Removal)...");

    try {
        // Drop Foreign Key Constraint if it exists
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "PatientTreatment" DROP CONSTRAINT IF EXISTS "PatientTreatment_serviceId_fkey";`);
            console.log("✅ Dropped FK constraint 'PatientTreatment_serviceId_fkey'.");
        } catch (e) {
            console.warn("⚠️ Error dropping constraint (might not exist):", e.message);
        }

        // Also insure the column is nullable just in case (it is defined as String? in prisma so it should be fine)

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
