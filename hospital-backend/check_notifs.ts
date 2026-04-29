import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const list = await prisma.notification.findMany({
        where: { message: { contains: 'RDV_CHAIN' } }
    });
    console.log(JSON.stringify(list, null, 2));
}
main().finally(() => prisma.$disconnect());
