import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const notifs = await prisma.notification.findMany({
        where: { message: { contains: 'RDV_CHAIN' } },
        include: { utilisateur: true }
    });
    console.log('--- RDV_CHAIN Notifications ---');
    notifs.forEach(n => {
        console.log(`ID: ${n.id}, User: ${n.utilisateur?.nom} (${n.utilisateurId}), Message: ${n.message}`);
    });

    const appointments = await prisma.rendezVous.findMany({
        where: { statut: 'CONFIRME' },
        include: { patient: { include: { utilisateur: true } } }
    });
    console.log('\n--- Confirmed Appointments ---');
    appointments.forEach(a => {
        console.log(`ID: ${a.id}, Date: ${a.date.toISOString()}, User: ${a.patient?.utilisateur?.nom} (${a.patient?.utilisateurId})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
