import { PrismaClient } from '@prisma/client';
import { Response, Router } from 'express';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();


router.get('/profile', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const utilisateur = await prisma.utilisateur.findUnique({
            where: { id: req.userId },
            include: {
                patient: {
                    include: { dossierMedical: true }
                }
            }
        });
        if (!utilisateur || !utilisateur.patient) {
            return res.status(404).json({ error: 'Patient non trouvé' });
        }

        const { motDePasse, ...safeUser } = utilisateur;
        const d = utilisateur.patient.dossierMedical;

        return res.json({
            ...safeUser,
            telephone: utilisateur.patient.telephone,
            patientId: utilisateur.patient.id,
            birthDate: d?.dateNaissance || '',
            bloodGroup: d?.groupeSanguin || '',
            socialSecurity: d?.numSecuriteSociale || '',
            allergies: d?.allergies || [],
            history: d?.historiqueMedical || [],
            emergencyContact: {
                name: d?.contactUrgenceNom || '',
                relation: d?.contactUrgenceRelation || '',
                phone: d?.contactUrgenceTelephone || ''
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/notifications', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { utilisateurId: req.userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(notifications);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/notifications/:id/read', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const updated = await prisma.notification.update({
            where: { id: parseInt(req.params.id) },
            data: { lue: true }
        });
        return res.json(updated);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/consultations', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const consultations = await prisma.consultation.findMany({
            where: { patientId: patient.id },
            orderBy: { date: 'desc' }
        });
        return res.json(consultations);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
