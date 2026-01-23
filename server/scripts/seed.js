const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function main() {
    console.log('🌱 Starting Supabase Seeding...');

    // 1. Create Doctors (Matching Frontend constants.ts)
    const doctorsData = [
        { id: 'dr-1', name: 'Dr. Martin', spec: 'General', email: 'dr1@clinic.com' },
        { id: 'dr-2', name: 'Dra. Elena', spec: 'Ortodoncia', email: 'dr2@clinic.com' },
        { id: 'dr-3', name: 'Dr. Fernando', spec: 'Implantología', email: 'dr3@clinic.com' },
        { id: 'dr-4', name: 'Dra. Ana', spec: 'Estética', email: 'dr4@clinic.com' },
        { id: 'dr-5', name: 'Dr. Carlos', spec: 'Periodoncia', email: 'dr5@clinic.com' }
    ];

    for (const d of doctorsData) {
        // Upsert Doctor
        await prisma.doctor.upsert({
            where: { id: d.id },
            update: {
                name: d.name,
                specialty: {
                    connectOrCreate: { where: { name: d.spec }, create: { name: d.spec } }
                }
            },
            create: {
                id: d.id,
                name: d.name,
                specialty: {
                    connectOrCreate: { where: { name: d.spec }, create: { name: d.spec } }
                },
                commissionPercentage: 0.35
            }
        });

        // Upsert User linked to Doctor
        const existingUser = await prisma.user.findUnique({ where: { email: d.email } });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    email: d.email,
                    password: '123',
                    name: d.name,
                    role: 'DOCTOR',
                    doctorId: d.id
                }
            });
        }
    }

    // 2. Create Receptionists
    const recepts = ['recepcion1@clinic.com', 'recepcion2@clinic.com'];
    for (const mail of recepts) {
        if (!(await prisma.user.findUnique({ where: { email: mail } }))) {
            console.log(`Creating Receptionist: ${mail}`);
            await prisma.user.create({
                data: {
                    email: mail,
                    password: '123',
                    name: 'Recepción ' + mail.split('@')[0].slice(-1),
                    role: 'RECEPTION'
                }
            });
        }
    }

    // 3. Create Admin
    if (!(await prisma.user.findUnique({ where: { email: 'admin@clinic.com' } }))) {
        console.log(`Creating Admin`);
        await prisma.user.create({
            data: {
                email: 'admin@clinic.com',
                password: '123',
                name: 'Director Médico',
                role: 'ADMIN'
            }
        });
    }

    // 4. Create Dummy Patients (For Immediate Visual Feedback)
    const dummyPatients = [
        { name: "Juan Pérez", dni: "12345678A", email: "juan@test.com", insurance: "Sanitas", birthDate: new Date("1980-01-01") },
        { name: "María López", dni: "87654321B", email: "maria@test.com", insurance: "Adeslas", birthDate: new Date("1992-05-15") },
        { name: "Carlos Ruiz", dni: "11223344C", email: "carlos@test.com", insurance: "DKV", birthDate: new Date("1975-11-30") }
    ];

    for (const p of dummyPatients) {
        if (!(await prisma.patient.findUnique({ where: { dni: p.dni } }))) {
            console.log(`Creating Patient: ${p.name}`);
            await prisma.patient.create({
                data: {
                    name: p.name,
                    dni: p.dni,
                    email: p.email,
                    insurance: p.insurance,
                    birthDate: p.birthDate
                }
            });
        }
    }

    // 5. Create Services/Treatments Catalog
    const DENTAL_SERVICES = [
        { id: 'srv-1', name: 'Limpieza Dental', price: 50, specialization: 'General' },
        { id: 'srv-2', name: 'Obturación Simple', price: 60, specialization: 'General' },
        { id: 'srv-3', name: 'Endodoncia Unirradicular', price: 120, specialization: 'General' },
        { id: 'srv-4', name: 'Implante Titanio', price: 1200, specialization: 'Implantes' }, // Nota: DB usa 'Implantes' o 'IMPLANTOLOGY'? Revisar Doctor spec. Doctor usa 'IMPLANTOLOGY' en constants pero 'Cirugía'/'Neurología' en seed. Hay inconsistencia.
        // Voy a usar los valores del seed de Doctors para matchear lo mejor posible, o mejor, actualizar los doctors para usar ENUMs si fuera posible.
        // En seed Doctors: 'Diagnostico', 'Cirugía', 'Neurología', 'General', 'Nutrición'.
        // En constants Frontend: GENERAL, ORTHODONTICS, IMPLANTOLOGY, ESTHETICS, PERIODONTICS.
        // ESTO ES UN PROBLEMA. Hay mismatch de datos.
        // Voy a intentar alinear 'srv-4' (Implante) con 'Cirugía' que es lo más parecido a Implantes en el seed actual? O crear specialidad nueva?
        // Mejor creo los servicios tal cual el frontend los espera, y actualizo los doctores si es necesario.
        // El frontend envía `srv-4`. El backend valida `specialtyId`?
        // server/index.js: `treatment.specialtyId !== doctor.specialtyId`
        // Las tablas parecen tener `specialtyId` (string?).

        // Voy a poner las especialidades textuales que usa el frontend mapeadas a lo que tengan los doctores en BD.
        // Doctores en BD Seed:
        // Dr. House -> Diagnostico
        // Dra. Grey -> Cirugía
        // Dr. Strange -> Neurología
        // Dra. Quinn -> General

        // Servicios Frontend:
        // srv-1 (Limpieza) -> General -> Dra Quinn (OK)
        // srv-4 (Implante) -> Implantology. No hay doctor 'Implantology'. Dra Grey es 'Cirugía'.
        // srv-5 (Orto) -> Orthodontics. No hay doctor 'Orto'.

        // SOLUCION: Actualizar también los doctores en el seed para que matcheen las especialidades del frontend.
        { id: 'srv-5', name: 'Ortodoncia Brackets', price: 100, specialization: 'Ortodoncia' },
        { id: 'srv-6', name: 'Invisalign Full', price: 3500, specialization: 'Ortodoncia' },
        { id: 'srv-7', name: 'Blanqueamiento Zoom', price: 300, specialization: 'Estética' },
        { id: 'srv-8', name: 'Corona Zirconio', price: 350, specialization: 'Estética' },
        { id: 'srv-9', name: 'Extracción Simple', price: 40, specialization: 'General' },
        { id: 'srv-10', name: 'Curetaje por Cuadrante', price: 70, specialization: 'Periodoncia' }
    ];

    // Mapeo seguro para evitar errores de restricción, usando upsert o createMany skipDuplicates
    for (const s of DENTAL_SERVICES) {
        // Prisma no tiene createManyskipDuplicates para SQL simple a veces, usar upsert
        await prisma.treatment.upsert({
            where: { id: s.id },
            update: {
                name: s.name,
                price: s.price,
                specialty: {
                    connectOrCreate: {
                        where: { name: s.specialization },
                        create: { name: s.specialization }
                    }
                }
            },
            create: {
                id: s.id,
                name: s.name,
                price: s.price,
                specialty: {
                    connectOrCreate: {
                        where: { name: s.specialization },
                        create: { name: s.specialization }
                    }
                }
            }
        });
    }

    console.log('✅ Seeding Completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
