import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateProfessional, AuthRequest } from '../middleware/auth';

const router = Router();

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

router.post('/', authenticateProfessional, async (req: AuthRequest, res) => {
    if (req.role !== 'ADMIN' && req.role !== 'SOUS_ADMIN') {
        return res.status(403).json({ error: 'Accès réservé à l’administration' });
    }

    const { nom, etage, batiment, description, icon, color, bgColor, type } = req.body || {};
    if (!nom || etage === undefined || !batiment || !type) {
        return res.status(400).json({ error: 'Champs requis: nom, etage, batiment, type' });
    }

    try {
        const created = await prisma.lieuInteret.create({
            data: {
                nom,
                etage: Number(etage),
                batiment,
                description: description || null,
                icon: icon || null,
                color: color || null,
                bgColor: bgColor || null,
                type
            }
        });
        return res.status(201).json(created);
    } catch (error) {
        console.error('Error creating guidance:', error);
        return res.status(500).json({ error: 'Failed to create guidance data' });
    }
});

router.put('/:id', authenticateProfessional, async (req: AuthRequest, res) => {
    if (req.role !== 'ADMIN' && req.role !== 'SOUS_ADMIN') {
        return res.status(403).json({ error: 'Accès réservé à l’administration' });
    }

    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const { nom, etage, batiment, description, icon, color, bgColor, type } = req.body || {};

    try {
        const updated = await prisma.lieuInteret.update({
            where: { id },
            data: {
                ...(nom !== undefined ? { nom } : {}),
                ...(etage !== undefined ? { etage: Number(etage) } : {}),
                ...(batiment !== undefined ? { batiment } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(icon !== undefined ? { icon } : {}),
                ...(color !== undefined ? { color } : {}),
                ...(bgColor !== undefined ? { bgColor } : {}),
                ...(type !== undefined ? { type } : {})
            }
        });
        return res.json(updated);
    } catch (error) {
        console.error('Error updating guidance:', error);
        return res.status(500).json({ error: 'Failed to update guidance data' });
    }
});

export default router;