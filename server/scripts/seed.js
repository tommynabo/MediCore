const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function main() {
    console.log('🌱 Starting Supabase Seeding...');

    // 1. Create Doctors
    const doctorsData = [
        { name: 'Dr. House', spec: 'Diagnostico', email: 'dr1@clinic.com' },
        { name: 'Dra. Grey', spec: 'Cirugía', email: 'dr2@clinic.com' },
        { name: 'Dr. Strange', spec: 'Neurología', email: 'dr3@clinic.com' },
        { name: 'Dra. Quinn', spec: 'General', email: 'dr4@clinic.com' },
        { name: 'Dr. Oz', spec: 'Nutrición', email: 'dr5@clinic.com' }
    ];

    for (const d of doctorsData) {
        const existing = await prisma.user.findUnique({ where: { email: d.email } });
        if (!existing) {
            console.log(`Creating Doctor: ${d.name}`);
            const doc = await prisma.doctor.create({
                data: { name: d.name, specialization: d.spec, commissionPercentage: 0.30 }
            });
            await prisma.user.create({
                data: {
                    email: d.email,
                    password: '123',
                    name: d.name,
                    role: 'DOCTOR',
                    doctorId: doc.id
                }
            });
        }
    }

    // 2. Create Receptionists
    const recepts = ['recepcion1@clinic.com', 'recepcion2@clinic.com'];
    for (const mail of recepts) {
        if (!(await prisma.user.findUnique({ where: { email: mail } }))) {
            console.log(`Creating Receptionist: ${mail}`);
            await prisma.user.create({
                data: {
                    email: mail,
                    password: '123',
                    name: 'Recepción ' + mail.split('@')[0].slice(-1),
                    role: 'RECEPTION'
                }
            });
        }
    }

    // 3. Create Admin
    if (!(await prisma.user.findUnique({ where: { email: 'admin@clinic.com' } }))) {
        console.log(`Creating Admin`);
        await prisma.user.create({
            data: {
                email: 'admin@clinic.com',
                password: '123',
                name: 'Director Médico',
                role: 'ADMIN'
            }
        });
    }

    // 4. Create Dummy Patients (For Immediate Visual Feedback)
    const dummyPatients = [
        { name: "Juan Pérez", dni: "12345678A", email: "juan@test.com", insurance: "Sanitas", birthDate: new Date("1980-01-01") },
        { name: "María López", dni: "87654321B", email: "maria@test.com", insurance: "Adeslas", birthDate: new Date("1992-05-15") },
        { name: "Carlos Ruiz", dni: "11223344C", email: "carlos@test.com", insurance: "DKV", birthDate: new Date("1975-11-30") }
    ];

    for (const p of dummyPatients) {
        if (!(await prisma.patient.findUnique({ where: { dni: p.dni } }))) {
            console.log(`Creating Patient: ${p.name}`);
            await prisma.patient.create({
                data: {
                    name: p.name,
                    dni: p.dni,
                    email: p.email,
                    insurance: p.insurance,
                    birthDate: p.birthDate
                }
            });
        }
    }

    console.log('✅ Seeding Completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
