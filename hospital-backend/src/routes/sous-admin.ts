import { PrismaClient } from '@prisma/client';
import { Response, Router } from 'express';
import { authenticateSousAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();


router.get('/appointments', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { date, statut } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } }) as any;
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const appointments = await prisma.rendezVous.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                ...(statut ? { statut: statut as any } : {}),
                sousAdminId: sousAdmin.id,
                ...(sousAdmin.specialite ? {
                    OR: [
                        { specialite: sousAdmin.specialite },
                        { specialite: sousAdmin.specialite.toLowerCase() }
                    ]
                } : {})
            },
            include: {
                patient: { include: { utilisateur: true } },
                medecin: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        const formatted = appointments.map(apt => ({
            id: apt.id,
            date: apt.date.toISOString().split('T')[0],
            time: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            patientId: apt.patientId,
            doctor: apt.medecin
                ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                : 'À définir',
            specialty: apt.medecin?.specialite || '',
            medecinId: apt.medecinId,
            motif: apt.motif || '',
            statut: apt.statut,
            isUrgent: apt.isUrgent,
            presenceStatus: apt.presenceStatus,
            lieu: apt.lieu,
            salle: apt.salle,
            sousAdminId: apt.sousAdminId
        }));

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/appointments/pending', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } }) as any;
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const appointments = await prisma.rendezVous.findMany({
            where: {
                statut: 'EN_ATTENTE',
                sousAdminId: sousAdmin.id,
                ...(sousAdmin.specialite ? {
                    OR: [
                        { specialite: sousAdmin.specialite },
                        { specialite: sousAdmin.specialite.toLowerCase() }
                    ]
                } : {})
            },
            include: {
                patient: { include: { utilisateur: true } },
                medecin: { include: { utilisateur: true } }
            },
            orderBy: [{ isUrgent: 'desc' }, { createdAt: 'asc' }]
        });

        return res.json(appointments.map(apt => ({
            id: apt.id,
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            patientId: apt.patientId,
            motif: apt.motif || '',
            specialite: apt.specialite || '',
            isUrgent: apt.isUrgent,
            requestedAt: apt.createdAt
        })));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/appointments/create', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { patientId, medecinId, date, motif, lieu, salle, isUrgent } = req.body;
    if (!patientId || !date) return res.status(400).json({ error: 'patientId et date sont requis' });

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const apt = await prisma.rendezVous.create({
            data: {
                patientId: parseInt(patientId),
                medecinId: medecinId ? parseInt(medecinId) : null,
                sousAdminId: sousAdmin.id,
                date: new Date(date),
                motif: motif || null,
                lieu: lieu || 'À définir',
                salle: salle || 'À définir',
                isUrgent: !!isUrgent,
                statut: medecinId ? 'CONFIRME' : 'EN_ATTENTE',
                presenceStatus: 'PREVU'
            },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: apt.patient.utilisateurId,
                titre: '📅 Rendez-vous planifié',
                message: `Un rendez-vous a été planifié pour vous le ${new Date(date).toLocaleDateString('fr-FR')}${salle ? ` — Salle ${salle}` : ''}.`
            }
        });

        return res.status(201).json({ message: 'Rendez-vous créé', appointment: apt });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/appointments/:id/reschedule', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { date, medecinId, lieu, salle } = req.body;
    if (!date) return res.status(400).json({ error: 'Nouvelle date requise' });

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(req.params.id as string) },
            data: {
                date: new Date(date),
                statut: 'CONFIRME',
                sousAdminId: sousAdmin.id,
                ...(medecinId ? { medecinId: parseInt(medecinId) } : {}),
                ...(lieu ? { lieu } : {}),
                ...(salle ? { salle } : {})
            },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: '🔄 Rendez-vous reporté',
                message: `Votre rendez-vous a été reporté au ${new Date(date).toLocaleDateString('fr-FR')}${salle ? ` — Salle ${salle}` : ''}.`
            }
        });

        return res.json({ message: 'Rendez-vous reporté', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/appointments/:id/assign', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { medecinId, date, lieu, salle } = req.body;
    if (!medecinId || !date) return res.status(400).json({ error: 'medecinId et date sont requis' });

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(req.params.id as string) },
            data: {
                medecinId: parseInt(medecinId),
                date: new Date(date),
                lieu: lieu || 'À définir',
                salle: salle || 'À définir',
                statut: 'CONFIRME',
                sousAdminId: sousAdmin.id
            },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: '✅ Rendez-vous confirmé',
                message: `Votre rendez-vous a été confirmé pour le ${new Date(date).toLocaleDateString('fr-FR')} — ${salle || 'salle à définir'}.`
            }
        });

        return res.json({ message: 'Rendez-vous assigné et confirmé', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});


router.patch('/appointments/:id/presence', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { presenceStatus } = req.body;
    if (!presenceStatus) return res.status(400).json({ error: 'presenceStatus requis' });

    try {
        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(req.params.id as string) },
            data: { presenceStatus }
        });
        return res.json({ message: 'Statut de présence mis à jour', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/appointments/:id/cancel', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(req.params.id as string) },
            data: { statut: 'ANNULE' },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: '❌ Rendez-vous annulé',
                message: 'Votre rendez-vous a été annulé. Veuillez prendre contact avec le service hospitalier.'
            }
        });

        return res.json({ message: 'Rendez-vous annulé', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});




router.get('/waiting-room', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const entries = await prisma.salleAttente.findMany({
            where: { sousAdminId: sousAdmin.id },
            include: {
                patient: { include: { utilisateur: true } }
            },
            orderBy: { joinedAt: 'asc' }
        });

        return res.json(entries.map(e => ({
            id: e.id,
            patientId: e.patientId,
            patientName: `${e.patient.utilisateur.prenom} ${e.patient.utilisateur.nom}`,
            joinedAt: e.joinedAt,
            status: e.status
        })));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/waiting-room', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId requis' });

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const entry = await prisma.salleAttente.create({
            data: {
                sousAdminId: sousAdmin.id,
                patientId: parseInt(patientId),
                status: 'EN_ATTENTE'
            }
        });

        return res.status(201).json(entry);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/waiting-room/:id', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    try {
        const updated = await prisma.salleAttente.update({
            where: { id: parseInt(req.params.id as string) },
            data: { status }
        });
        return res.json(updated);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.delete('/waiting-room/:id', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        await prisma.salleAttente.delete({ where: { id: parseInt(req.params.id as string) } });
        return res.json({ message: 'Patient retiré de la salle d\'attente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/waiting-room/:id/checkin', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const entry = await prisma.salleAttente.update({
            where: { id: parseInt(req.params.id as string) },
            data: { status: 'EN_CONSULTATION' },
            include: { patient: { include: { utilisateur: true } } }
        });

        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

        await prisma.rendezVous.updateMany({
            where: {
                patientId: entry.patientId,
                statut: 'CONFIRME',
                date: { gte: startOfDay, lte: endOfDay }
            },
            data: { presenceStatus: 'PRESENT' }
        });

        return res.json({
            message: `${entry.patient.utilisateur.prenom} ${entry.patient.utilisateur.nom} est en consultation`,
            entry
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/waiting-room/next', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { medecinId } = req.body;
    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });


        const next = await prisma.salleAttente.findFirst({
            where: { sousAdminId: sousAdmin.id, status: 'EN_ATTENTE' },
            include: { patient: { include: { utilisateur: true } } },
            orderBy: { joinedAt: 'asc' }
        });

        if (!next) return res.status(404).json({ error: 'Aucun patient en attente' });


        await prisma.salleAttente.update({ where: { id: next.id }, data: { status: 'EN_CONSULTATION' } });


        if (medecinId) {
            const medecin = await prisma.medecin.findUnique({ where: { id: parseInt(medecinId) } });
            if (medecin) {
                await prisma.notification.create({
                    data: {
                        utilisateurId: medecin.utilisateurId,
                        titre: '🔔 Patient suivant',
                        message: `Prochain patient : ${next.patient.utilisateur.prenom} ${next.patient.utilisateur.nom}.`
                    }
                });
            }
        }

        return res.json({
            message: 'Patient suivant appelé',
            patient: {
                id: next.patientId,
                name: `${next.patient.utilisateur.prenom} ${next.patient.utilisateur.nom}`
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/doctors', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { date, specialite } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } }) as any;
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const doctors = await prisma.medecin.findMany({
            where: {
                ...(specialite ? { specialite: specialite as string } : {}),
                ...(sousAdmin.specialite ? {
                    OR: [
                        { specialite: sousAdmin.specialite },
                        { specialite: sousAdmin.specialite.toLowerCase() }
                    ]
                } : {})
            },
            include: {
                utilisateur: true,
                conges: {
                    where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } }
                },
                rendezVous: {
                    where: { date: { gte: startOfDay, lte: endOfDay }, statut: { not: 'ANNULE' } }
                }
            }
        });

        const formatted = doctors.map(doc => {
            const isOnLeave = doc.conges.length > 0;
            const count = doc.rendezVous.length;
            let status = 'Disponible';
            if (isOnLeave) status = 'En congé';
            else if (count >= 15) status = 'Complet';
            else if (count >= 8) status = 'Chargé';

            return {
                id: doc.id,
                utilisateurId: doc.utilisateurId,
                nom: doc.utilisateur.nom,
                prenom: doc.utilisateur.prenom,
                fullName: `Dr. ${doc.utilisateur.prenom} ${doc.utilisateur.nom}`,
                specialite: doc.specialite,
                status,
                workload: count,
                maxCapacity: 15,
                appointments: doc.rendezVous.map(a => ({
                    id: a.id,
                    time: a.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    isUrgent: a.isUrgent,
                    presenceStatus: a.presenceStatus
                }))
            };
        });

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/stats', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } }) as any;
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const [appointments, waitingRoom, totalPatients] = await Promise.all([
            prisma.rendezVous.findMany({
                where: {
                    date: { gte: startOfDay, lte: endOfDay },
                    sousAdminId: sousAdmin.id,
                    ...(sousAdmin.specialite ? {
                        OR: [
                            { specialite: sousAdmin.specialite },
                            { specialite: sousAdmin.specialite.toLowerCase() }
                        ]
                    } : {})
                }
            }),
            prisma.salleAttente.count({
                where: {
                    status: 'EN_ATTENTE',
                    sousAdminId: sousAdmin.id
                }
            }),
            prisma.patient.count()
        ]);

        return res.json({
            total: appointments.length,
            pending: appointments.filter(a => a.statut === 'EN_ATTENTE').length,
            confirmed: appointments.filter(a => a.statut === 'CONFIRME').length,
            present: appointments.filter(a => a.presenceStatus === 'PRESENT').length,
            urgent: appointments.filter(a => a.isUrgent).length,
            late: appointments.filter(a => a.presenceStatus === 'EN_RETARD').length,
            absent: appointments.filter(a => a.presenceStatus === 'ABSENT').length,
            waitingRoomCount: waitingRoom,
            totalPatients
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/patients', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { search } = req.query;
    try {
        const patients = await prisma.patient.findMany({
            include: { utilisateur: true },
            where: search ? {
                OR: [
                    { utilisateur: { nom: { contains: search as string, mode: 'insensitive' } } },
                    { utilisateur: { prenom: { contains: search as string, mode: 'insensitive' } } },
                    { utilisateur: { email: { contains: search as string, mode: 'insensitive' } } }
                ]
            } : undefined,
            orderBy: { utilisateur: { nom: 'asc' } }
        });

        return res.json(patients.map(p => ({
            id: p.id,
            nom: p.utilisateur.nom,
            prenom: p.utilisateur.prenom,
            fullName: `${p.utilisateur.prenom} ${p.utilisateur.nom}`,
            email: p.utilisateur.email,
            telephone: p.telephone
        })));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/activities', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const activities = await prisma.notification.findMany({
            where: { utilisateurId: req.userId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const formatted = activities.map(act => ({
            id: act.id,
            action: act.message,
            time: formatTimeAgo(act.createdAt),
            type: act.titre.includes('📅') ? 'appointment' : 'general'
        }));

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


function formatTimeAgo(date: Date) {
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Le ${date.toLocaleDateString('fr-FR')}`;
}

router.post('/notify-doctor', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { medecinId, titre, message } = req.body;
    if (!medecinId || !message) return res.status(400).json({ error: 'medecinId et message requis' });

    try {
        const medecin = await prisma.medecin.findUnique({ where: { id: parseInt(medecinId) } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const notif = await prisma.notification.create({
            data: {
                utilisateurId: medecin.utilisateurId,
                titre: titre || '📢 Message du secrétariat',
                message: message
            }
        });

        return res.status(201).json({ message: 'Notification envoyée au médecin', notification: notif });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
