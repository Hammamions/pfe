import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_MARKER = '[RDV_SEED:DEMO]';

const FIRST_SLOT_MINUTES = 40;
const SECOND_SLOT_HOURS = 3;

async function main() {
    const deleted = await prisma.rendezVous.deleteMany({
        where: {
            OR: [
                { motif: { contains: SEED_MARKER } },
                { motif: { contains: '[TEST_TODAY:PREVISIT_DOCS]' } }
            ]
        }
    });
    console.log(`--- RDV de test supprimés : ${deleted.count} ---`);

    const patients = await prisma.patient.findMany({
        include: { utilisateur: true },
        orderBy: { id: 'asc' }
    });

    if (!patients.length) {
        console.log('Aucun patient trouvé. Impossible de créer des rendez-vous de test.');
        return;
    }

    const doctors = await prisma.medecin.findMany({
        include: { utilisateur: true },
        orderBy: { id: 'asc' }
    });
    const sousAdmins = await prisma.sousAdmin.findMany({
        orderBy: { id: 'asc' }
    });

    const defaultDoctor = doctors[0] ?? null;
    const defaultSousAdmin = sousAdmins[0] ?? null;
    const created: Array<{ patientId: number; appointmentId: number; at: Date }> = [];

    const now = new Date();
    const slotFirst = new Date(now.getTime() + FIRST_SLOT_MINUTES * 60 * 1000);
    const slotSecond = new Date(now.getTime() + SECOND_SLOT_HOURS * 60 * 60 * 1000);

    const baseMotif =
        `Consultation de suivi ${SEED_MARKER} ` +
        '[DOC:1] [DOC_NAME:Analyse-cardio.pdf] [DOC_URL:https%3A%2F%2Fexample.com%2FAnalyse-cardio.pdf]';

    for (const patient of patients) {
        const firstApt = await prisma.rendezVous.create({
            data: {
                patientId: patient.id,
                medecinId: defaultDoctor?.id ?? null,
                sousAdminId: defaultSousAdmin?.id ?? null,
                date: slotFirst,
                statut: 'CONFIRME',
                lieu: 'Service cardiologie',
                salle: 'Salle A',
                specialite: defaultDoctor?.specialite || 'Cardiologie',
                motif: `${baseMotif}`
            }
        });

        const secondApt = await prisma.rendezVous.create({
            data: {
                patientId: patient.id,
                medecinId: defaultDoctor?.id ?? null,
                sousAdminId: defaultSousAdmin?.id ?? null,
                date: slotSecond,
                statut: 'CONFIRME',
                lieu: 'Service cardiologie',
                salle: 'Salle B',
                specialite: defaultDoctor?.specialite || 'Cardiologie',
                motif: `${baseMotif}`
            }
        });

        created.push({ patientId: patient.id, appointmentId: firstApt.id, at: firstApt.date });
        created.push({ patientId: patient.id, appointmentId: secondApt.id, at: secondApt.date });

        await prisma.notification.create({
            data: {
                utilisateurId: patient.utilisateurId,
                titre: 'Rendez-vous test créés',
                message:
                    `Deux rendez-vous de test ont été ajoutés aujourd’hui (#${firstApt.id}, #${secondApt.id}) ` +
                    `— 1er créneau dans ${FIRST_SLOT_MINUTES} min, 2e dans ${SECOND_SLOT_HOURS} h.`
            }
        });
    }

    console.log('--- Nouveaux RDV test ---');
    console.log(`Patients : ${patients.length}`);
    console.log(`Rendez-vous créés : ${created.length}`);
    created.forEach((row) => {
        console.log(
            `- patientId=${row.patientId} | rdvId=${row.appointmentId} | date=${row.at.toISOString()}`
        );
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
