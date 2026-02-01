const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Restoring default templates...');

    const defaults = [
        {
            name: 'Recordatorio Cita',
            content: 'Hola {{PACIENTE}}, le recordamos su cita con {{DOCTOR}} el día {{FECHA}} a las {{HORA}}. Por favor confirme asistencia.',
            triggerType: 'APPOINTMENT_REMINDER',
            triggerOffset: '24h'
        },
        {
            name: 'Seguimiento Tratamiento',
            content: 'Hola {{PACIENTE}}, ¿qué tal evoluciona su tratamiento de {{TRATAMIENTO}}? Cualquier molestia no dude en contactarnos.',
            triggerType: 'TREATMENT_FOLLOWUP',
            triggerOffset: '48h'
        }
    ];

    for (const t of defaults) {
        // Check if exists by name to avoid duplicates if run multiple times
        const existing = await prisma.whatsAppTemplate.findFirst({ where: { name: t.name } });
        if (!existing) {
            await prisma.whatsAppTemplate.create({ data: t });
            console.log(`✅ Created: ${t.name}`);
        } else {
            console.log(`⚠️ Skipped (exists): ${t.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
