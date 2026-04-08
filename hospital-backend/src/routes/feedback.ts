import { PrismaClient } from '@prisma/client';
import { Response, Router } from 'express';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();


router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { note, commentaire } = req.body;
    if (note === undefined) return res.status(400).json({ error: 'Note requise' });

    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const feedback = await prisma.feedback.create({
            data: { note, commentaire, patientId: patient.id }
        });
        return res.status(201).json(feedback);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const feedbacks = await prisma.feedback.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(feedbacks);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
