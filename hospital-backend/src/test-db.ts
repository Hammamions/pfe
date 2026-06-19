
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing database connection...');
        const count = await prisma.utilisateur.count();
        console.log('Successfully connected! User count:', count);
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
