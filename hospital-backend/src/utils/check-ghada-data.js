const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ghada = await prisma.utilisateur.findFirst({
        where: {
            OR: [
                { nom: { contains: 'Bagane', mode: 'insensitive' } },
                { prenom: { contains: 'Ghada', mode: 'insensitive' } }
            ]
        },
        include: {
            patient: {
                include: {
                    dossierMedical: {
                        include: { documents: true }
                    },
                    rendezVous: true,
                    ordonnances: true
                }
            },
            notifications: true
        }
    });

    if (!ghada) {
        console.log('Patient Ghada non trouvé');
        return;
    }

    console.log('--- Utilisateur ---');
    console.log(`ID: ${ghada.id}, Nom: ${ghada.prenom} ${ghada.nom}, Email: ${ghada.email}`);

    console.log('\n--- Notifications ---');
    console.log(`Total: ${ghada.notifications.length}`);
    ghada.notifications.slice(0, 5).forEach(n => {
        console.log(`- [${n.createdAt.toISOString()}] ${n.titre}: ${n.message}`);
    });

    if (ghada.patient) {
        console.log('\n--- Patient ---');
        console.log(`ID Patient: ${ghada.patient.id}`);

        console.log('\n--- Documents ---');
        const docs = ghada.patient.dossierMedical?.documents || [];
        console.log(`Total Documents: ${docs.length}`);
        docs.forEach(d => {
            console.log(`- [${d.createdAt.toISOString()}] ${d.titre} (Type: ${d.type})`);
        });

        console.log('\n--- Ordonnances ---');
        console.log(`Total: ${ghada.patient.ordonnances.length}`);

        console.log('\n--- Historique Médical (JSON) ---');
        const hist = ghada.patient.dossierMedical?.historiqueMedical || [];
        console.log(`Total entrées: ${hist.length}`);
        hist.slice(0, 3).forEach((h, i) => {
            console.log(`- ${i}: ${h}`);
        });
    } else {
        console.log('\nL\'utilisateur n\'a pas de profil Patient lié.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
