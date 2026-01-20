const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Files are expected in the root, but script runs from server/scripts/
const PATIENTS_CSV = path.join(__dirname, '../../patients.csv');
const PRODUCTS_CSV = path.join(__dirname, '../../products.csv');

async function importPatients() {
    console.log("🚀 Starting PATIENT Import...");
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(PATIENTS_CSV)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Parsed ${results.length} patients from CSV.`);

                // Clear existing
                try {
                    console.log("Cleaning up dependent tables...");
                    // Delete in order of dependencies (Child -> Parent)
                    await prisma.budgetLineItem.deleteMany({});
                    await prisma.budget.deleteMany({});
                    await prisma.installment.deleteMany({});
                    await prisma.treatmentPlan.deleteMany({});
                    await prisma.invoiceItem.deleteMany({});
                    await prisma.invoice.deleteMany({});
                    await prisma.liquidation.deleteMany({});
                    await prisma.appointment.deleteMany({});
                    await prisma.clinicalRecord.deleteMany({});
                    await prisma.dentalSnapshot.deleteMany({});
                    await prisma.odontogram.deleteMany({});

                    await prisma.patient.deleteMany({});
                    console.log("Deleted existing patients and related data.");
                } catch (e) {
                    console.warn("Could not clear patients (maybe foreign key constraints?):", e.message);
                }

                let successCount = 0;
                let failCount = 0;

                for (const row of results) {
                    try {
                        const name = (row['NOMBRE'] || '') + ' ' + (row['APELLIDOS'] || '');
                        if (!name.trim()) continue; // Skip empty names

                        // Valid Date Logic
                        let birthDate = new Date("1900-01-01"); // Default
                        if (row['F. NACIMIENTO']) {
                            // "dd/mm/yyyy" -> new Date() often expects mm/dd/yyyy or yyyy-mm-dd
                            const parts = row['F. NACIMIENTO'].split('/');
                            if (parts.length === 3) {
                                const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                                if (!isNaN(parsedDate.getTime())) {
                                    birthDate = parsedDate;
                                }
                            }
                        }

                        // Final safety check
                        if (isNaN(birthDate.getTime())) {
                            birthDate = new Date("1900-01-01");
                        }

                        // DNI - Critical Unique Field
                        let dni = row['DNI'];
                        if (!dni || dni.trim() === '') {
                            // Fallback to internal ID or generate one if missing
                            // Use IDCONTACTO if available to be deterministic, else random
                            const fallback = row['IDCONTACTO'] || Math.random().toString(36).substr(2, 9);
                            dni = `NO-DNI-${fallback}`;
                        }

                        // Sanitize Email
                        // If multiple users have same fake email, unique constraint might fail if enforced.
                        // Schema says String (not unique).
                        const email = row['EMAIL'] && row['EMAIL'].includes('@') ? row['EMAIL'] : `noemail-${dni}@system.local`;

                        await prisma.patient.create({
                            data: {
                                name: name.trim(),
                                dni: dni.trim(),
                                email: email,
                                phone: row['TELF. MOVIL'] || row['TELF. FIJO'] || '',
                                birthDate: birthDate,
                                insurance: row['MUTUA'] || 'Privado',
                            }
                        });
                        successCount++;
                    } catch (e) {
                        try {
                            if (e.code === 'P2002') {
                                console.warn(`Duplicate DNI ${row['DNI']}, attempting fallback...`);
                            } else {
                                console.warn(`Failed to import patient: ${e.message}`);
                            }
                        } catch (inner) { }
                        failCount++;
                    }
                }
                console.log(`✅ Patients Imported: ${successCount} | Failed: ${failCount}`);
                resolve();
            })
            .on('error', reject);
    });
}

async function importProducts() {
    console.log("🚀 Starting PRODUCT Import...");
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(PRODUCTS_CSV)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Parsed ${results.length} products from CSV.`);

                try {
                    await prisma.inventoryItem.deleteMany({});
                    console.log("Deleted existing inventory.");
                } catch (e) {
                    console.warn("Could not clear inventory:", e.message);
                }

                let successCount = 0;

                for (const row of results) {
                    try {
                        const name = row['PRODUCTO'];
                        if (!name) continue;

                        const qty = parseInt(row['UNIDADES']) || 0;
                        const min = parseInt(row['AVISO 1']) || 5;

                        // Calculate quantity if 0? No, rely on CSV. 

                        await prisma.inventoryItem.create({
                            data: {
                                name: name,
                                category: row['PROVEEDOR'] || 'General',
                                quantity: qty,
                                minStock: min,
                                unit: 'ud'
                            }
                        });
                        successCount++;
                    } catch (e) {
                        console.error("Product Import Error:", e.message);
                    }
                }
                console.log(`✅ Products Imported: ${successCount}`);
                resolve();
            })
            .on('error', reject);
    });
}

(async () => {
    try {
        await prisma.$connect();
        await importPatients();
        await importProducts();
        console.log("🎉 ALL IMPORTS COMPLETED.");
    } catch (e) {
        console.error("Fatal Import Error:", e);
    } finally {
        await prisma.$disconnect();
    }
})();
