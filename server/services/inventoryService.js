
const analyzeStock = async (prisma, currentStock) => {
    // 1. Define Resource Map (Treatment -> Required Items)
    // In a real app, this would be in the DB (TreatmentItems table)
    const RESOURCE_MAP = {
        'Implante Titanio': { 'i2': 1 }, // ID 'i2' is Implante Titanio 4mm from frontend constants
        'Consulta General': { 'i1': 1 }, // ID 'i1' is Guantes (1 pair per consult)
        'Cleaning': { 'i1': 1 }
    };

    // 2. Fetch Appointments for next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingAppointments = await prisma.appointment.findMany({
        where: {
            date: {
                gte: new Date(),
                lte: nextWeek
            },
            status: 'SCHEDULED'
        },
        include: { treatment: true }
    });

    // 3. Calculate Projected Usage
    const usage = {};
    upcomingAppointments.forEach(appt => {
        const treatmentName = appt.treatment?.name;
        const requirements = RESOURCE_MAP[treatmentName];

        if (requirements) {
            Object.entries(requirements).forEach(([itemId, qty]) => {
                usage[itemId] = (usage[itemId] || 0) + qty;
            });
        }
    });

    // 4. Compare with Current Stock (passed from Frontend source of truth)
    const alerts = [];
    currentStock.forEach(item => {
        const predictedUsage = usage[item.id] || 0;
        const projectedStock = item.quantity - predictedUsage;

        if (projectedStock < item.minStock) {
            alerts.push({
                itemId: item.id,
                name: item.name,
                currentQuantity: item.quantity,
                predictedUsage,
                projectedStock,
                message: `⚠️ Alerta de Stock: "${item.name}" se agotará. Uso previsto: ${predictedUsage}, Stock actual: ${item.quantity}.`
            });
        }
    });

    return { alerts, usageAnalysis: usage };
};

module.exports = { analyzeStock };
