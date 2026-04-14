import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'sous-admin@hopital.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Checking if account ${email} already exists...`);
    const existingUser = await prisma.utilisateur.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log('User already exists. Updating role to SOUS_ADMIN...');
        await prisma.utilisateur.update({
            where: { email },
            data: { role: 'SOUS_ADMIN' }
        });

        const exSA = await prisma.sousAdmin.findUnique({ where: { utilisateurId: existingUser.id } });
        if (!exSA) {
            await prisma.sousAdmin.create({
                data: {
                    utilisateurId: existingUser.id,
                    specialite: 'Cardiologie'
                }
            });
        }
    } else {
        console.log('Creating new SOUS_ADMIN account...');
        const newUser = await prisma.utilisateur.create({
            data: {
                email,
                motDePasse: hashedPassword,
                nom: 'Admin',
                prenom: 'Sous',
                role: 'SOUS_ADMIN',
            }
        });

        await prisma.sousAdmin.create({
            data: {
                utilisateurId: newUser.id,
                specialite: 'Cardiologie'
            }
        });
    }

    console.log('-----------------------------------');
    console.log('Demo SOUS_ADMIN account is ready!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
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
