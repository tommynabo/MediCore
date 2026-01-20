const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding...');

    // 1. Create 5 Doctors
    const doctorsData = [
        { id: 'dr-1', name: 'Dra. Elena Vega', specialization: 'General', commissionPercentage: 0.4 },
        { id: 'dr-2', name: 'Dr. Marcos Ruiz', specialization: 'Odontología', commissionPercentage: 0.35 },
        { id: 'dr-3', name: 'Dra. Sarah Conner', specialization: 'Ortodoncia', commissionPercentage: 0.45 },
        { id: 'dr-4', name: 'Dr. Emmet Brown', specialization: 'Cirugía', commissionPercentage: 0.50 },
        { id: 'dr-5', name: 'Dra. Gregory House', specialization: 'Diagnóstico', commissionPercentage: 0.40 }
    ];

    for (const dr of doctorsData) {
        await prisma.doctor.upsert({
            where: { id: dr.id },
            update: {},
            create: dr
        });
    }
    console.log('✅ 5 Doctors created');

    // 2. Create Patients
    const patientsData = [];
    for (let i = 0; i < 50; i++) {
        const insurance = i % 3 === 0 ? 'Sanitas' : (i % 3 === 1 ? 'Adeslas' : 'Privado');
        patientsData.push({
            id: `p-${i}`,
            name: `Paciente ${i}`,
            dni: `1234567${i}X`,
            email: `paciente${i}@test.com`,
            insurance: insurance,
            birthDate: new Date('1990-01-01'),
            assignedDoctorId: doctorsData[i % 5].id
        });
    }

    for (const p of patientsData) {
        await prisma.patient.upsert({
            where: { id: p.id },
            update: {},
            create: p,
        });
    }
    console.log('✅ Patients created');

    // 3. Create Treatments
    const treatment1 = await prisma.treatment.create({ data: { name: 'Consulta General', price: 60.0, labCost: 0.0 } });
    const treatment2 = await prisma.treatment.create({ data: { name: 'Implante Titanio', price: 1200.0, labCost: 300.0 } });

    console.log('✅ Treatments created');

    // 4. Create Appointments
    // History (Payroll)
    for (let i = 0; i < 30; i++) {
        const isImplant = i % 5 === 0;
        const treat = isImplant ? treatment2 : treatment1;
        const doc = doctorsData[i % 5];

        // Create completed appointment
        const appt = await prisma.appointment.create({
            data: {
                date: new Date(Date.now() - (Math.floor(Math.random() * 30) * 86400000)), // Past 30 days
                time: `${9 + (i % 8)}:00`,
                status: 'COMPLETED',
                doctorId: doc.id,
                patientId: `p-${i}`,
                treatmentId: treat.id
            }
        });

        // Create Liquidation for it immediately
        await prisma.liquidation.create({
            data: {
                doctorId: doc.id,
                appointmentId: appt.id,
                grossAmount: treat.price,
                labCost: treat.labCost,
                commissionRate: doc.commissionPercentage,
                finalAmount: (treat.price - treat.labCost) * doc.commissionPercentage,
                status: 'PENDING'
            }
        });
    }

    // Future (Stock Alerts & Agenda)
    for (let i = 0; i < 20; i++) {
        const isImplant = i % 3 === 0; // High demand for implants to trigger alert
        const treat = isImplant ? treatment2 : treatment1;

        await prisma.appointment.create({
            data: {
                date: new Date(Date.now() + ((i % 7) * 86400000)), // Next 7 days
                time: `${9 + (i % 8)}:00`,
                status: 'SCHEDULED',
                doctorId: doctorsData[i % 5].id,
                patientId: `p-${i + 30}`,
                treatmentId: treat.id
            }
        });
    }

    console.log('✅ Appointments & Liquidations created');
    console.log('🌱 Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
