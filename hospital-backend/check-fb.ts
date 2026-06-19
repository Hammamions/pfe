import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
prisma.feedback.findMany().then(f => console.log(JSON.stringify(f, null, 2))).catch(console.error).finally(() => prisma.$disconnect());
