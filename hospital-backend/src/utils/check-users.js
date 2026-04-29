const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.utilisateur.findMany({
        where: {
            OR: [
                { nom: { contains: 'Ghada', mode: 'insensitive' } },
                { prenom: { contains: 'Ghada', mode: 'insensitive' } },
                { nom: { contains: 'Bagan', mode: 'insensitive' } }
            ]
        },
        select: { id: true, nom: true, prenom: true, email: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
