const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const totalUsers = await prisma.user.count();
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const receptions = await prisma.user.count({ where: { role: 'RECEPTION' } });
    const doctors = await prisma.user.count({ where: { role: 'DOCTOR' } });

    console.log(`Total: ${totalUsers}`);
    console.log(`Admins: ${admins}`);
    console.log(`Reception: ${receptions}`);
    console.log(`Doctors: ${doctors}`);

    // Check specific emails
    const owner = await prisma.user.findUnique({ where: { email: 'admin@clinic.com' } });
    console.log("Owner exists:", !!owner);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
