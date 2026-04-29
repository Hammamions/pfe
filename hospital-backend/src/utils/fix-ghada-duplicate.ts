import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Starting surgical fix for Ghada duplicate accounts...");

    // Find the "Seeder" user (Two 'n's)
    const seederUser = await prisma.utilisateur.findFirst({
        where: { nom: { contains: 'Baganne', mode: 'insensitive' } },
        include: { patient: true }
    });

    // Find the "App" user (One 'n')
    const appUser = await prisma.utilisateur.findFirst({
        where: { nom: { equals: 'Bagane', mode: 'insensitive' } },
        include: { patient: true }
    });

    if (!seederUser || !appUser) {
        console.log("Could not find both users. Checking for any users named Ghada...");
        const allGhadas = await prisma.utilisateur.findMany({
            where: { prenom: { contains: 'Ghada', mode: 'insensitive' } },
            include: { patient: true }
        });
        console.log("Found " + allGhadas.length + " users named Ghada.");
        allGhadas.forEach(u => console.log(`- ID: ${u.id}, Name: ${u.prenom} ${u.nom}, Email: ${u.email}`));

        if (allGhadas.length >= 2) {
            console.log("Multiple Ghadas found. Standardizing to the first one and moving data...");
            // Let's assume the one with "Bagane" or the oldest one is the right one
            const target = allGhadas.find(u => u.nom.toLowerCase() === 'bagane') || allGhadas[0];
            const others = allGhadas.filter(u => u.id !== target.id);

            for (const other of others) {
                console.log(`Moving data from ${other.prenom} ${other.nom} (ID ${other.id}) to ${target.prenom} ${target.nom} (ID ${target.id})`);

                // Move Notifications
                await prisma.notification.updateMany({
                    where: { utilisateurId: other.id },
                    data: { utilisateurId: target.id }
                });

                if (other.patient && target.patient) {
                    // Move Appointments
                    await prisma.rendezVous.updateMany({
                        where: { patientId: other.patient.id },
                        data: { patientId: target.patient.id }
                    });

                    // Move Ordonnances
                    await prisma.ordonnance.updateMany({
                        where: { patientId: other.patient.id },
                        data: { patientId: target.patient.id }
                    });

                    // Move Documents
                    const otherDM = await prisma.dossierMedical.findUnique({ where: { patientId: other.patient.id } });
                    const targetDM = await prisma.dossierMedical.upsert({
                        where: { patientId: target.patient.id },
                        create: { patientId: target.patient.id },
                        update: {}
                    });

                    if (otherDM) {
                        await prisma.document.updateMany({
                            where: { dossierMedicalId: otherDM.id },
                            data: { dossierMedicalId: targetDM.id }
                        });

                        // Merge Historique Medical
                        if (Array.isArray(otherDM.historiqueMedical) && otherDM.historiqueMedical.length > 0) {
                            await prisma.dossierMedical.update({
                                where: { id: targetDM.id },
                                data: {
                                    historiqueMedical: {
                                        push: otherDM.historiqueMedical as string[]
                                    }
                                }
                            });
                        }
                    }
                }

                // Finally, rename target to the preferred spelling if needed
                await prisma.utilisateur.update({
                    where: { id: target.id },
                    data: { nom: 'Bagane' } // Standardize to one 'n' as seen in app
                });

                console.log(`Migration complete for ID ${other.id}`);
            }
        }
    } else {
        console.log(`Found Seeder User (ID ${seederUser.id}) and App User (ID ${appUser.id}). Merging...`);

        // Move Notifications
        await prisma.notification.updateMany({
            where: { utilisateurId: seederUser.id },
            data: { utilisateurId: appUser.id }
        });

        if (seederUser.patient && appUser.patient) {
            // Move Appointments
            await prisma.rendezVous.updateMany({
                where: { patientId: seederUser.patient.id },
                data: { patientId: appUser.patient.id }
            });

            // Move Ordonnances
            await prisma.ordonnance.updateMany({
                where: { patientId: seederUser.patient.id },
                data: { patientId: appUser.patient.id }
            });

            // Move Documents
            const seederDM = await prisma.dossierMedical.findUnique({ where: { patientId: seederUser.patient.id } });
            const appDM = await prisma.dossierMedical.upsert({
                where: { patientId: appUser.patient.id },
                create: { patientId: appUser.patient.id },
                update: {}
            });

            if (seederDM) {
                await prisma.document.updateMany({
                    where: { dossierMedicalId: seederDM.id },
                    data: { dossierMedicalId: appDM.id }
                });

                if (Array.isArray(seederDM.historiqueMedical)) {
                    await prisma.dossierMedical.update({
                        where: { id: appDM.id },
                        data: {
                            historiqueMedical: {
                                push: seederDM.historiqueMedical as string[]
                            }
                        }
                    });
                }
            }
        }
        console.log("Merge complete.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
