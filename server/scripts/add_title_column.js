// Add title column to Budget table using Prisma raw SQL
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTitleColumn() {
    console.log("📋 Checking if 'title' column exists in Budget table...");

    try {
        // Check if column exists
        const result = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Budget' AND column_name = 'title'
        `;

        if (result.length === 0) {
            console.log("⚙️ Adding 'title' column to Budget table...");
            await prisma.$executeRaw`
                ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "title" TEXT
            `;
            console.log("✅ 'title' column added successfully!");
        } else {
            console.log("✅ 'title' column already exists.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

addTitleColumn();
