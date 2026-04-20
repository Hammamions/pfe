import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@tunisante.com').trim().toLowerCase();
    const password = process.env.ADMIN_SEED_PASSWORD || 'admin123';
    const prenom = process.env.ADMIN_SEED_PRENOM || 'Admin';
    const nom = process.env.ADMIN_SEED_NOM || 'Principal';

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Vérification du compte ${email}...`);
    const existingUser = await prisma.utilisateur.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log('Compte existant : mise à jour en ADMIN + ligne Admin...');
        await prisma.utilisateur.update({
            where: { id: existingUser.id },
            data: {
                role: 'ADMIN',
                motDePasse: hashedPassword,
                prenom,
                nom
            }
        });
        const ex = await prisma.admin.findUnique({ where: { utilisateurId: existingUser.id } });
        if (!ex) {
            await prisma.admin.create({ data: { utilisateurId: existingUser.id } });
        }
    } else {
        console.log('Création du compte ADMIN...');
        const user = await prisma.utilisateur.create({
            data: {
                email,
                motDePasse: hashedPassword,
                prenom,
                nom,
                role: 'ADMIN',
                admin: { create: {} }
            }
        });
        console.log(`Utilisateur créé id=${user.id}`);
    }

    console.log('-----------------------------------');
    console.log('Compte ADMIN prêt (base uniquement).');
    console.log(`Email    : ${email}`);
    console.log(`Mot de passe : ${password}`);
    console.log('-----------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
