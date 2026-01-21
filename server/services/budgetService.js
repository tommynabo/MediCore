// server/services/budgetService.js

const createBudget = async (supabase, patientId, items = []) => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0);

    // 1. Create Budget
    const { data: budget, error: budgetError } = await supabase
        .from('Budget')
        .insert([{
            patientId,
            status: 'DRAFT',
            totalAmount,
            date: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }])
        .select()
        .single();

    if (budgetError) throw new Error("Error creating budget: " + budgetError.message);

    // 2. Create Items
    if (items.length > 0) {
        const lineItems = items.map(item => ({
            budgetId: budget.id,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity) || 1,
            tooth: item.tooth ? String(item.tooth) : null,
            face: item.face || null,
            treatmentId: item.treatmentId || null
        }));

        const { error: itemsError } = await supabase
            .from('BudgetLineItem')
            .insert(lineItems);

        if (itemsError) console.error("Error adding budget items:", itemsError);
    }

    // 3. Add to Clinical History (Shadow Record)
    await supabase.from('ClinicalRecord').insert([{
        patientId,
        date: new Date().toISOString(),
        clinicalData: {
            treatment: 'Nuevo Presupuesto',
            observation: `Presupuesto creado con importe total: ${totalAmount}€ (${items.length} items)`,
        },
        specialization: 'General',
        isEncrypted: false
    }]);

    // Return full structure
    const { data: fullBudget } = await supabase
        .from('Budget')
        .select('*, items:BudgetLineItem(*)')
        .eq('id', budget.id)
        .single();

    return fullBudget;
};

const getBudgetsByPatient = async (supabase, patientId) => {
    const { data, error } = await supabase
        .from('Budget')
        .select('*, items:BudgetLineItem(*)')
        .eq('patientId', patientId)
        .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
};

const updateBudgetStatus = async (supabase, budgetId, status) => {
    const { data, error } = await supabase
        .from('Budget')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', budgetId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

const addItemToDraftBudget = async (supabase, patientId, item) => {
    // Find most recent DRAFT budget
    let { data: budget } = await supabase
        .from('Budget')
        .select('*')
        .eq('patientId', patientId)
        .eq('status', 'DRAFT')
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

    // Create if not exists
    if (!budget) {
        const { data: newBudget, error: createError } = await supabase
            .from('Budget')
            .insert([{
                patientId,
                status: 'DRAFT',
                totalAmount: 0,
                date: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) throw new Error("Error creating draft budget: " + createError.message);
        budget = newBudget;
    }

    // Add Item
    const { data: lineItem, error: itemError } = await supabase
        .from('BudgetLineItem')
        .insert([{
            budgetId: budget.id,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity) || 1,
            tooth: item.tooth ? String(item.tooth) : null,
            face: item.face || null,
            treatmentId: item.treatmentId || null
        }])
        .select()
        .single();

    if (itemError) throw new Error("Error adding item: " + itemError.message);

    // Update Total
    const newTotal = Number(budget.totalAmount) + (Number(lineItem.price) * Number(lineItem.quantity));
    await supabase.from('Budget').update({ totalAmount: newTotal, updatedAt: new Date().toISOString() }).eq('id', budget.id);

    return await supabase
        .from('Budget')
        .select('*, items:BudgetLineItem(*)')
        .eq('id', budget.id)
        .single();
};

const convertBudgetToInvoice = async (supabase, budgetId) => {
    // 1. Get Budget
    const { data: budget, error: budgetError } = await supabase
        .from('Budget')
        .select('*, items:BudgetLineItem(*)')
        .eq('id', budgetId)
        .single();

    if (budgetError || !budget) throw new Error("Budget not found");

    // 2. Create Invoice
    const invoiceData = {
        invoiceNumber: `INV-${Date.now()}`,
        patientId: budget.patientId,
        amount: budget.totalAmount,
        status: 'PENDING',
        date: new Date().toISOString()
    };

    const { data: invoice, error: invoiceError } = await supabase
        .from('Invoice')
        .insert([invoiceData])
        .select()
        .single();

    if (invoiceError) throw new Error("Error creating invoice: " + invoiceError.message);

    // 3. Create Invoice Items
    if (budget.items && budget.items.length > 0) {
        const invoiceItems = budget.items.map(item => ({
            invoiceId: invoice.id,
            name: item.name,
            price: item.price,
            serviceId: item.treatmentId || null
        }));
        await supabase.from('InvoiceItem').insert(invoiceItems);
    }

    // 4. Update Budget Status
    await supabase.from('Budget').update({ status: 'CONVERTED' }).eq('id', budgetId);

    return invoice;
};

module.exports = {
    createBudget,
    getBudgetsByPatient,
    updateBudgetStatus,
    addItemToDraftBudget,
    convertBudgetToInvoice
};
