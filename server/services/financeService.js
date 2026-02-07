
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

    // Date filtering logic could be added here using monthStr

    const records = await prisma.liquidation.findMany({
        where,
        include: {
            appointment: {
                include: {
                    treatment: true,
                    patient: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Format records for frontend display
    const formattedRecords = records.map(r => ({
        id: r.id,
        doctorId: r.doctorId,
        grossAmount: r.grossAmount,
        labCost: r.labCost || 0,
        commissionRate: r.commissionRate,
        finalAmount: r.finalAmount,
        status: r.status,
        date: r.createdAt || r.appointment?.date,
        treatmentName: r.appointment?.treatment?.name ||
            r.appointment?.notes ||
            'Pago con Saldo',
        patientName: r.appointment?.patient?.name || 'Paciente'
    }));

    const total = formattedRecords.reduce((sum, r) => sum + r.finalAmount, 0);

    return {
        records: formattedRecords,
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
            totalCost: totalAmount, // Schema uses totalCost, we receive totalAmount
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
    const createdInstallments = [];
    for (const inst of installmentsData) {
        const created = await prisma.installment.create({ data: inst });
        createdInstallments.push(created);
    }

    // Generate invoice for down payment if applicable
    let downPaymentInvoice = null;
    if (downPayment > 0 && createdInstallments.length > 0) {
        const downPaymentInst = createdInstallments[0]; // First installment is the down payment
        try {
            // Get patient info for invoice
            const patient = await prisma.patient.findUnique({ where: { id: patientId } });
            if (patient) {
                const quipuService = require('./quipuService');
                const { createClient } = require('@supabase/supabase-js');
                const crypto = require('crypto');

                // Initialize Supabase
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
                );

                // Create contact in Quipu
                const contact = await quipuService.getOrCreateContact(patient);

                if (contact && contact.id) {
                    // Create invoice in Quipu
                    const today = new Date().toISOString().split('T')[0];
                    const invoiceResult = await quipuService.createInvoice(
                        contact.id,
                        [{ name: `${name} - Entrada Inicial`, quantity: 1, price: downPayment }],
                        today,
                        today,
                        'card'
                    );

                    if (invoiceResult && invoiceResult.success) {
                        // Update the installment with invoice info
                        await prisma.installment.update({
                            where: { id: downPaymentInst.id },
                            data: {
                                invoiceId: invoiceResult.id,
                                invoicedAt: new Date(),
                                status: 'PAID'
                            }
                        });

                        // ALSO save to CRM Invoice table so it appears in Facturación section
                        const invoiceId = crypto.randomUUID();
                        const { data: savedInvoice, error: invError } = await supabase
                            .from('Invoice')
                            .insert([{
                                id: invoiceId,
                                invoiceNumber: invoiceResult.number || 'PENDING',
                                externalId: invoiceResult.id,
                                amount: downPayment,
                                status: 'issued',
                                date: new Date().toISOString(),
                                url: invoiceResult.pdf_url || null,
                                patientId: patient.id,
                                paymentMethod: 'card'
                            }])
                            .select()
                            .single();

                        if (invError) {
                            console.error('⚠️ Failed to save invoice to CRM:', invError.message);
                        } else {
                            console.log(`✅ Invoice saved to CRM: ${savedInvoice.invoiceNumber}`);
                        }

                        downPaymentInvoice = {
                            ...invoiceResult,
                            crmInvoiceId: savedInvoice?.id
                        };
                        console.log(`✅ Down payment invoice created: ${invoiceResult.number}`);
                    }
                }
            }
        } catch (invoiceError) {
            console.error('⚠️ Failed to create down payment invoice:', invoiceError.message);
            // Continue anyway - plan created, invoice can be generated manually
        }
    }

    const finalPlan = await prisma.treatmentPlan.findUnique({
        where: { id: plan.id },
        include: { installments: true }
    });

    return {
        plan: finalPlan,
        downPaymentInvoice
    };
}

/**
 * Process due installments - Generate invoices for installments due today
 */
async function processDueInstallments(prisma) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find installments due today that haven't been invoiced yet
    const dueInstallments = await prisma.installment.findMany({
        where: {
            dueDate: {
                gte: today,
                lt: tomorrow
            },
            invoiceId: null,
            status: 'PENDING'
        },
        include: {
            plan: {
                include: {
                    patient: true
                }
            }
        }
    });

    console.log(`📋 Found ${dueInstallments.length} installments due today`);

    const results = [];
    const quipuService = require('./quipuService');

    for (const inst of dueInstallments) {
        try {
            const patient = inst.plan.patient;
            if (!patient) continue;

            // Create contact in Quipu
            const contact = await quipuService.getOrCreateContact(patient);
            if (!contact || !contact.id) continue;

            // Create invoice
            const todayStr = new Date().toISOString().split('T')[0];
            const invoiceResult = await quipuService.createInvoice(
                contact.id,
                [{ name: `${inst.plan.name} - ${inst.description}`, quantity: 1, price: inst.amount }],
                todayStr,
                todayStr,
                'card'
            );

            if (invoiceResult && invoiceResult.success) {
                // Update installment
                await prisma.installment.update({
                    where: { id: inst.id },
                    data: {
                        invoiceId: invoiceResult.id,
                        invoicedAt: new Date()
                    }
                });

                results.push({
                    installmentId: inst.id,
                    patientName: patient.name,
                    amount: inst.amount,
                    invoiceNumber: invoiceResult.number,
                    success: true
                });

                console.log(`✅ Invoice created for ${patient.name}: ${inst.description} (${inst.amount}€)`);
            }
        } catch (err) {
            console.error(`❌ Failed to invoice installment ${inst.id}:`, err.message);
            results.push({
                installmentId: inst.id,
                error: err.message,
                success: false
            });
        }
    }

    return results;
}

/**
 * Get upcoming installments for reminders (due in X days)
 */
async function getUpcomingInstallments(prisma, daysAhead = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return await prisma.installment.findMany({
        where: {
            dueDate: {
                gte: targetDate,
                lt: nextDay
            },
            reminderSent: false,
            status: 'PENDING'
        },
        include: {
            plan: {
                include: {
                    patient: true
                }
            }
        }
    });
}

/**
 * Mark installment as paid
 */
async function markInstallmentPaid(prisma, installmentId) {
    return await prisma.installment.update({
        where: { id: installmentId },
        data: {
            status: 'PAID',
            paidDate: new Date()
        }
    });
}

module.exports = {
    calculateLiquidation,
    getPayroll,
    createFinancingPlan,
    processDueInstallments,
    getUpcomingInstallments,
    markInstallmentPaid
};
