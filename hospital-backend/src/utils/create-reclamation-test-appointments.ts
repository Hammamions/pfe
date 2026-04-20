import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { normalizeSpecialty } from './specialty';

const prisma = new PrismaClient();

const SEED_MARKER = '[RDV_SEED:RECLAMATION_DEMO]';

/** Crée 2 RDV (2 patients distincts) déjà en demande patient pour tester la file secrétaire. */
async function main() {
    const removed = await prisma.rendezVous.deleteMany({
        where: { motif: { contains: SEED_MARKER } }
    });
    console.log(`--- Anciens RDV test réclamation supprimés : ${removed.count} ---`);

    const patients = await prisma.patient.findMany({
        include: { utilisateur: true },
        orderBy: { id: 'asc' },
        take: 2
    });

    if (patients.length < 2) {
        console.error(
            'Il faut au moins 2 patients en base. Créez un second compte patient (inscription) puis relancez : npm run seed:reclamation-rdv-test'
        );
        process.exitCode = 1;
        return;
    }

    const doctors = await prisma.medecin.findMany({
        include: { utilisateur: true },
        orderBy: { id: 'asc' }
    });
    const sousAdmins = await prisma.sousAdmin.findMany({
        include: { utilisateur: true },
        orderBy: { id: 'asc' }
    });

    const doctor = doctors[0];
    const sa = sousAdmins[0];

    if (!doctor) {
        console.error('Aucun médecin en base. Impossible de créer les RDV.');
        process.exitCode = 1;
        return;
    }

    const specialty =
        (sa?.specialite && normalizeSpecialty(sa.specialite)) ||
        normalizeSpecialty(doctor.specialite || '') ||
        'Cardiologie';

    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(0, 0, 0, 0);

    const slotAnnulation = new Date(base);
    slotAnnulation.setHours(10, 15, 0, 0);

    const slotReport = new Date(base);
    slotReport.setHours(14, 30, 0, 0);

    const motifAnnulation = `[ANNULER] Consultation — test demande d’annulation ${SEED_MARKER}`.trim();
    const motifReport = `[REPORT] Consultation — test demande de report ${SEED_MARKER}`.trim();

    const [p1, p2] = patients;

    const apt1 = await prisma.rendezVous.create({
        data: {
            patientId: p1.id,
            medecinId: doctor.id,
            sousAdminId: sa?.id ?? null,
            date: slotAnnulation,
            statut: 'EN_ATTENTE',
            lieu: 'Bâtiment principal',
            salle: 'A-101',
            specialite: specialty,
            motif: motifAnnulation
        }
    });

    const apt2 = await prisma.rendezVous.create({
        data: {
            patientId: p2.id,
            medecinId: doctor.id,
            sousAdminId: sa?.id ?? null,
            date: slotReport,
            statut: 'EN_ATTENTE',
            lieu: 'Bâtiment principal',
            salle: 'B-201',
            specialite: specialty,
            motif: motifReport
        }
    });

    if (sa?.utilisateurId) {
        await prisma.notification.createMany({
            data: [
                {
                    utilisateurId: sa.utilisateurId,
                    titre: '📌 Nouvelle demande patient (test)',
                    message: `Demande d’annulation — RDV #${apt1.id} (${p1.utilisateur.prenom} ${p1.utilisateur.nom}). ${SEED_MARKER}`
                },
                {
                    utilisateurId: sa.utilisateurId,
                    titre: '📌 Nouvelle demande patient (test)',
                    message: `Demande de report — RDV #${apt2.id} (${p2.utilisateur.prenom} ${p2.utilisateur.nom}). ${SEED_MARKER}`
                }
            ]
        });
    }

    console.log('--- RDV test « réclamation » créés ---');
    console.log(
        `Patient 1 (${p1.utilisateur.email}) — annulation — rdvId=${apt1.id} — ${slotAnnulation.toISOString()}`
    );
    console.log(
        `Patient 2 (${p2.utilisateur.email}) — report — rdvId=${apt2.id} — ${slotReport.toISOString()}`
    );
    console.log(`Médecin : Dr. ${doctor.utilisateur.prenom} ${doctor.utilisateur.nom} (id=${doctor.id})`);
    console.log(`Secrétaire assignée : sousAdminId=${sa?.id ?? 'null'}`);
    console.log('Ouvrez l’espace secrétaire → Rendez-vous : les demandes doivent apparaître dans la liste des réclamations / demandes.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
