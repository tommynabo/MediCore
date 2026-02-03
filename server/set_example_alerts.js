
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const dniToFind = '23878160C';

    console.log(`🔍 Buscando paciente con DNI: ${dniToFind}`);

    const patient = await prisma.patient.findUnique({
        where: { dni: dniToFind }
    });

    if (!patient) {
        console.error("❌ Paciente no encontrado.");
        // Try fuzzy search if needed or finding by name "Tomas Navarro"
        const fuzzy = await prisma.patient.findFirst({
            where: { name: { contains: 'Tomas Navarro', mode: 'insensitive' } }
        });
        if (fuzzy) {
            console.log(`✅ Encontrado por nombre: ${fuzzy.name} (ID: ${fuzzy.id})`);
            updatePatient(fuzzy.id);
        } else {
            console.error("❌ No se encontró ni por DNI ni por nombre.");
            process.exit(1);
        }
    } else {
        console.log(`✅ Encontrado: ${patient.name} (ID: ${patient.id})`);
        updatePatient(patient.id);
    }
}

async function updatePatient(id) {
    try {
        const updated = await prisma.patient.update({
            where: { id },
            data: {
                allergies: "Alergia a la Penicilina\nAlergia al Latex",
                medications: "Sintrom 4mg (Diario)\nAdiro 100"
            }
        });
        console.log("✅ Paciente actualizado con alertas de ejemplo.");
        console.log("Alergias:", updated.allergies);
        console.log("Medicación:", updated.medications);
    } catch (e) {
        console.error("Error updating:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
