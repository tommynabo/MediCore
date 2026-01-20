
/**
 * Creates a treatment plan and generates installment schedule.
 */
async function createPlan(prisma, { patientId, name, totalCost, duration, startDate }) {
    // 1. Create Master Plan
    const plan = await prisma.treatmentPlan.create({
        data: {
            patientId,
            name,
            totalCost,
            duration,
            startDate: new Date(startDate),
            status: 'ACTIVE'
        }
    });

    // 2. Generate Installments (Schedule)
    const monthlyAmount = totalCost / duration;
    const installmentsData = [];

    let currentDate = new Date(startDate);

    for (let i = 0; i < duration; i++) {
        installmentsData.push({
            planId: plan.id,
            amount: monthlyAmount,
            dueDate: new Date(currentDate), // Clone date
            description: `Cuota ${i + 1}/${duration}`,
            status: 'PENDING'
        });

        // Add 1 month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    await prisma.installment.createMany({ data: installmentsData });

    return prisma.treatmentPlan.findUnique({
        where: { id: plan.id },
        include: { installments: true }
    });
}

/**
 * Checks for overdue payments for a patient.
 */
async function checkDelinquency(prisma, patientId) {
    const now = new Date();

    const overdueInstallments = await prisma.installment.findMany({
        where: {
            plan: { patientId },
            status: 'PENDING',
            dueDate: { lt: now }
        },
        include: { plan: true }
    });

    return overdueInstallments.map(inst => ({
        message: `Cuota ${inst.description} de ${inst.plan.name} VENCIDA`,
        amount: inst.amount,
        dueDate: inst.dueDate
    }));
}

module.exports = { createPlan, checkDelinquency };
