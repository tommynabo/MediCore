
/**
 * Calculates the liquidation for a doctor when a treatment is completed.
 * Formula: (TreatmentPrice - LabCost) * CommissionPercentage
 */
async function calculateLiquidation(prisma, appointment) {
    const { treatment, doctor } = appointment;

    if (!treatment || !doctor) {
        throw new Error('Missing Treatment or Doctor data');
    }

    const grossAmount = treatment.price;
    const labCost = treatment.labCost || 0;
    const commissionRate = doctor.commissionPercentage || 0;

    // Logic: Commission is applied on NET amount (Price - LabCost)
    const netAmount = grossAmount - labCost;
    const finalAmount = netAmount > 0 ? netAmount * commissionRate : 0;

    // Create Record
    return await prisma.liquidation.create({
        data: {
            doctorId: doctor.id,
            appointmentId: appointment.id,
            grossAmount,
            labCost,
            commissionRate,
            finalAmount,
            status: 'PENDING'
        }
    });
}

async function getPayroll(prisma, doctorId, monthStr) {
    // monthStr format 'YYYY-MM'
    const where = {};
    if (doctorId) where.doctorId = doctorId;

    // Date filtering logic could be added here

    const records = await prisma.liquidation.findMany({
        where,
        include: { appointment: { include: { treatment: true, patient: true } } }
    });

    const total = records.reduce((sum, r) => sum + r.finalAmount, 0);

    return {
        records,
        totalToPay: total
    };
}


/**
 * Creates a financing plan with installments.
 * @param {string} patientId 
 * @param {string} name - e.g. "Financiación Ortodoncia"
 * @param {number} totalAmount 
 * @param {number} downPayment - Initial payment
 * @param {number} installmentsCount - Number of monthly payments
 * @param {string} startDateStr - YYYY-MM-DD
 */
async function createFinancingPlan(prisma, { patientId, name, totalAmount, downPayment, installmentsCount, startDateStr }) {
    const startDate = new Date(startDateStr);
    const financedAmount = totalAmount - downPayment;
    const monthlyAmount = installmentsCount > 0 ? (financedAmount / installmentsCount) : 0;

    // 1. Create the Treatment Plan container
    const plan = await prisma.treatmentPlan.create({
        data: {
            patientId,
            name,
            totalAmount,
            startDate,
            duration: installmentsCount,
            status: 'ACTIVE'
        }
    });

    // 2. Create Down Payment Installment (if any)
    const installmentsData = [];

    if (downPayment > 0) {
        installmentsData.push({
            planId: plan.id,
            dueDate: new Date(), // Now
            amount: downPayment,
            status: 'PENDING', // Waiting for immediate payment
            description: 'Entrada Inicial'
        });
    }

    // 3. Create Monthly Installments
    for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i); // Add i months

        installmentsData.push({
            planId: plan.id,
            dueDate: dueDate,
            amount: parseFloat(monthlyAmount.toFixed(2)), // Round to 2 decimals
            status: 'PENDING',
            description: `Cuota ${i}/${installmentsCount}`
        });
    }

    // Batch create installments
    for (const inst of installmentsData) {
        await prisma.installment.create({ data: inst });
    }

    return await prisma.treatmentPlan.findUnique({
        where: { id: plan.id },
        include: { installments: true }
    });
}

module.exports = { calculateLiquidation, getPayroll, createFinancingPlan };
