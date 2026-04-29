const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.utilisateur.findMany({
        where: {
            OR: [
                { nom: { contains: 'Bagan', mode: 'insensitive' } },
                { prenom: { contains: 'Ghada', mode: 'insensitive' } }
            ]
        },
        select: { id: true, nom: true, prenom: true, email: true, role: true }
    });
    fs.writeFileSync('users_ghada.json', JSON.stringify(users, null, 2));
    console.log('Results written to users_ghada.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
