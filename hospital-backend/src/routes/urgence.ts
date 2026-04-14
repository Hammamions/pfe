import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();


router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const urgences = await prisma.urgence.findMany({
            where: { patientId: patient.id },
            orderBy: { date: 'desc' }
        });
        return res.json(urgences);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { typeUrgence } = req.body;
    if (!typeUrgence) return res.status(400).json({ error: "Type d'urgence requis" });

    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const newUrgence = await prisma.urgence.create({
            data: {
                typeUrgence,
                patientId: patient.id,
                statut: 'EN_COURS'
            }
        });

        // No patient notification here: patient notifications are restricted
        // to document received and appointment status updates only.

        return res.status(201).json(newUrgence);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erreur lors de la création de l'urgence" });
    }
});

export default router;
