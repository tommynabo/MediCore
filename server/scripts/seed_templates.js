const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const templates = [
    {
        name: 'Recordatorio Cita',
        content: 'Hola {{PATIENT_NAME}}, le recordamos su cita con {{DOCTOR_NAME}} para el día {{DATE}} a las {{TIME}}. Tratamiento: {{TREATMENT}}. Si desea cancelar, avise con 24h de antelación.',
        triggerType: 'APPOINTMENT_REMINDER',
        triggerOffset: '24h'
    },
    {
        name: 'Revisión 6 Meses',
        content: 'Hola {{PATIENT_NAME}}, han pasado 6 meses desde su última revisión. Le recomendamos agendar una cita para comprobar que todo sigue perfecto.',
        triggerType: 'TREATMENT_FOLLOWUP',
        triggerOffset: '6mo'
    }
];

async function main() {
    console.log('🌱 Seeding WhatsApp Templates...');
    for (const t of templates) {
        const exists = await prisma.whatsAppTemplate.findFirst({
            where: { name: t.name }
        });

        if (!exists) {
            await prisma.whatsAppTemplate.create({ data: t });
            console.log(`✅ Created template: ${t.name}`);
        } else {
            console.log(`ℹ️ Template already exists: ${t.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
