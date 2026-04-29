const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const patients = await prisma.patient.findMany({
        include: { utilisateur: true }
    });
    const result = patients.map(p => ({
        patientId: p.id,
        utilisateurId: p.utilisateurId,
        nom: p.utilisateur.nom,
        prenom: p.utilisateur.prenom,
        email: p.utilisateur.email
    }));
    fs.writeFileSync('all_patients_debug.json', JSON.stringify(result, null, 2));
    console.log('Results written to all_patients_debug.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
