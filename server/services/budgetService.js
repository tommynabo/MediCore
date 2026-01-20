const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createBudget = async (prisma, patientId, items = []) => {
    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    const budget = await prisma.budget.create({
        data: {
            patientId,
            status: 'DRAFT',
            totalAmount,
            items: {
                create: items.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1,
                    tooth: item.tooth,
                    face: item.face,
                    treatmentId: item.treatmentId
                }))
            }
        },
        include: { items: true }
    });
    return budget;
};

const getBudgetsByPatient = async (prisma, patientId) => {
    return await prisma.budget.findMany({
        where: { patientId },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });
};

const updateBudgetStatus = async (prisma, budgetId, status) => {
    return await prisma.budget.update({
        where: { id: budgetId },
        data: { status }
    });
};

const addItemToDraftBudget = async (prisma, patientId, item) => {
    // Find most recent DRAFT budget or create one
    let budget = await prisma.budget.findFirst({
        where: { patientId, status: 'DRAFT' },
        orderBy: { createdAt: 'desc' }
    });

    if (!budget) {
        budget = await prisma.budget.create({
            data: {
                patientId,
                status: 'DRAFT',
                totalAmount: 0
            }
        });
    }

    // Add Item
    const lineItem = await prisma.budgetLineItem.create({
        data: {
            budgetId: budget.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            tooth: item.tooth || null,
            face: item.face || null,
            treatmentId: item.treatmentId || null
        }
    });

    // Update Total
    const newTotal = budget.totalAmount + (lineItem.price * lineItem.quantity);
    await prisma.budget.update({
        where: { id: budget.id },
        data: { totalAmount: newTotal }
    });

    return await prisma.budget.findUnique({
        where: { id: budget.id },
        include: { items: true }
    });
};

const convertBudgetToInvoice = async (prisma, budgetId) => {
    const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { items: true }
    });

    if (!budget) throw new Error("Budget not found");

    // Create Invoice
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber: `INV-${Date.now()}`, // Simple generator
            patientId: budget.patientId,
            amount: budget.totalAmount,
            status: 'PENDING',
            items: {
                create: budget.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    serviceId: item.treatmentId
                }))
            }
        }
    });

    // Mark Budget as Converted
    await prisma.budget.update({
        where: { id: budgetId },
        data: { status: 'CONVERTED' }
    });

    return invoice;
};

module.exports = {
    createBudget,
    getBudgetsByPatient,
    updateBudgetStatus,
    addItemToDraftBudget,
    convertBudgetToInvoice
};
