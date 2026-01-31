const cron = require('node-cron');
const whatsappService = require('./whatsappService');

const startScheduler = (prisma) => {
    console.log('⏰ Starting WhatsApp Scheduler...');

    // Job 1: Appointment Reminders (Runs every hour)
    // Checks for appointments roughly 12 hours from now (+/- 30 mins window)
    cron.schedule('0 * * * *', async () => {
        console.log('⏳ Running Hourly Appointment Reminder Check...');
        try {
            const now = new Date();
            const startWindow = new Date(now.getTime() + (11.5 * 60 * 60 * 1000));
            const endWindow = new Date(now.getTime() + (12.5 * 60 * 60 * 1000));

            const appointments = await prisma.appointment.findMany({
                where: {
                    date: {
                        gte: startWindow,
                        lte: endWindow
                    },
                    status: 'Scheduled'
                },
                include: {
                    patient: true,
                    doctor: true,
                    treatment: true
                }
            });

            console.log(`🔎 Found ${appointments.length} appointments for reminders.`);

            // Get Reminder Template
            const template = await prisma.whatsAppTemplate.findFirst({
                where: { triggerType: 'APPOINTMENT_REMINDER' }
            });

            if (!template) {
                console.warn('⚠️ No APPOINTMENT_REMINDER template found. Skipping.');
                return;
            }

            for (const appt of appointments) {
                if (!appt.patient.phone) continue;

                // Check if already sent (avoid duplicates)
                // We'll look for a log entry for this patient & day & type
                /* 
                   Ideally we'd link log to appointmentId, but current schema links to Patient.
                   For now, we assume one reminder per trigger type per day/appointment is sufficient logic,
                   or just trust the strict time window won't overlap runs (it runs every hour, window is 1h, risk of edge case doubles).
                   Better: Check if a log exists created in the last 2 hours for this patient & type.
                */

                const alreadySent = await prisma.whatsAppLog.findFirst({
                    where: {
                        patientId: appt.patient.id,
                        type: 'APPOINTMENT_REMINDER',
                        sentAt: {
                            gte: new Date(now.getTime() - (2 * 60 * 60 * 1000)) // Sent recently
                        }
                    }
                });

                if (alreadySent) continue;

                // Format Message
                let msg = template.content
                    .replace('{{PATIENT_NAME}}', appt.patient.name)
                    .replace('{{DOCTOR_NAME}}', appt.doctor.name)
                    .replace('{{DATE}}', new Date(appt.date).toLocaleDateString('es-ES'))
                    .replace('{{TIME}}', appt.time)
                    .replace('{{TREATMENT}}', appt.treatment?.name || 'Consulta');

                try {
                    await whatsappService.sendMessage(appt.patient.phone, msg);

                    // Log Success
                    await prisma.whatsAppLog.create({
                        data: {
                            patientId: appt.patient.id,
                            type: 'APPOINTMENT_REMINDER',
                            status: 'SENT',
                            content: msg
                        }
                    });
                    console.log(`✅ Reminder sent to ${appt.patient.name}`);
                } catch (err) {
                    console.error(`❌ Failed to send to ${appt.patient.name}:`, err.message);
                    // Log Failure
                    await prisma.whatsAppLog.create({
                        data: {
                            patientId: appt.patient.id,
                            type: 'APPOINTMENT_REMINDER',
                            status: 'FAILED',
                            content: msg,
                            error: err.message
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error in Reminder Job:', error);
        }
    });

    // Job 2: Treatment Follow-ups (Runs daily at 9 AM)
    // Example: Check "Endodoncia" completed 6 months ago? 
    // This requires complex rules. For MVP we'll look for general "Follow Up" logic if defined.
    // Or we will implement the specific "Review" logic described.
    cron.schedule('0 9 * * *', async () => {
        console.log('⏳ Running Daily Follow-up Check...');
        // Implementation placeholder for follow-up logic based on completed treatments
    });
};

module.exports = { startScheduler };
