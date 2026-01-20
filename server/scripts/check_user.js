const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log("Checking for admin user...");
    const user = await prisma.user.findUnique({
        where: { email: 'admin@clinic.com' }
    });
    console.log("Found User:", user);

    const count = await prisma.user.count();
    console.log("Total Users in DB:", count);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
