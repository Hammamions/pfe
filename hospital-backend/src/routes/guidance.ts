import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const router = Router();

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    try {
        const guidanceData = await prisma.lieuInteret.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(guidanceData);
    } catch (error) {
        console.error('Error fetching guidance:', error);
        res.status(500).json({ error: 'Failed to fetch guidance data' });
    }
});

export default router;
