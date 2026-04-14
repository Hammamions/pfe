import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { dossierMedical: { include: { documents: true } } }
        });

        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
        if (!patient.dossierMedical) return res.json([]);

        return res.json(patient.dossierMedical.documents);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { titre, urlFichier, type } = req.body;
    if (!titre || !urlFichier) {
        return res.status(400).json({ error: 'Titre et URL du fichier requis' });
    }

    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });


        const dossier = await prisma.dossierMedical.upsert({
            where: { patientId: patient.id },
            create: { patientId: patient.id },
            update: {}
        });

        const doc = await prisma.document.create({
            data: {
                titre,
                urlFichier,
                type: type || null,
                dossierMedicalId: dossier.id
            }
        });


        await prisma.notification.create({
            data: {
                utilisateurId: req.userId!,
                titre: 'Document ajouté',
                message: `Le document "${titre}" a été ajouté à votre dossier médical.`
            }
        });

        return res.status(201).json(doc);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.delete('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { dossierMedical: true }
        });
        if (!patient || !patient.dossierMedical) return res.status(404).json({ error: 'Dossier non trouvé' });

        await prisma.document.deleteMany({
            where: { id: parseInt(req.params.id as string), dossierMedicalId: patient.dossierMedical.id }
        });

        return res.json({ message: 'Document supprimé' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
