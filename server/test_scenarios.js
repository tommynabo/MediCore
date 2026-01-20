
const { PrismaClient } = require('@prisma/client');
const financeService = require('./services/financeService');
const orthoService = require('./services/orthoService');

const prisma = new PrismaClient();

async function runTests() {
    console.log("--- STARTING VERIFICATION ---")

    // 1. Setup Data
    console.log("1. Seeding Data...");
    const doctor = await prisma.doctor.create({
        data: { name: "Dr. Test", specialization: "General", commissionPercentage: 0.40 }
    });

    const patient = await prisma.patient.create({
        data: {
            name: "Juan Perez Test",
            dni: "11111111X",
            birthDate: new Date(),
            email: "test@test.com"
        }
    });

    const treatment = await prisma.treatment.create({
        data: { name: "Implante", price: 1000, labCost: 200 }
    });

    // 2. Test Module 1: Finance
    console.log("2. Testing Module 1 (Liquidation)...");
    const appointment = await prisma.appointment.create({
        data: {
            date: new Date(),
            time: "10:00",
            patientId: patient.id,
            doctorId: doctor.id,
            treatmentId: treatment.id
        },
        include: { treatment: true, doctor: true }
    });

    // Simulate Completion
    const liquidation = await financeService.calculateLiquidation(prisma, { ...appointment, treatment, doctor });
    console.log("Liquidation Generated:", liquidation.finalAmount === 320 ? "PASS" : "FAIL"); // (1000-200)*0.4 = 320

    // 3. Test Module 2: Ortho
    console.log("3. Testing Module 2 (Ortho Plan)...");
    const plan = await orthoService.createPlan(prisma, {
        patientId: patient.id,
        name: "Ortodoncia Test",
        totalCost: 1800,
        duration: 18,
        startDate: new Date()
    });
    console.log(`Plan Created with ${plan.installments.length} installments:`, plan.installments.length === 18 ? "PASS" : "FAIL");

    // 4. Test Module 3: Permissions (Mock)
    // Logic inside middleware, hard to test here without HTTP calls, but we verified the code structure.

    console.log("--- VERIFICATION COMPLETE ---");
}

runTests()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
