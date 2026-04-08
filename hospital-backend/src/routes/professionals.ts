import { PrismaClient } from '@prisma/client';
import { Response, Router } from 'express';
import { authenticateProfessional, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();


router.get('/doctors', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    const { date, specialite } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const isSousAdmin = req.role === 'SOUS_ADMIN';
        let sa: any = null;
        if (isSousAdmin) {
            sa = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        }

        const doctors = await prisma.medecin.findMany({
            where: (isSousAdmin && sa && sa.specialite)
                ? {
                    OR: [
                        { specialite: sa.specialite },
                        { specialite: sa.specialite.toLowerCase() }
                    ]
                }
                : (specialite ? { specialite: specialite as string } : {}),
            include: {
                utilisateur: true,
                conges: { where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } } },
                rendezVous: {
                    where: { date: { gte: startOfDay, lte: endOfDay }, statut: { not: 'ANNULE' } }
                }
            }
        });

        return res.json(doctors.map(doc => {
            const isOnLeave = doc.conges.length > 0;
            const count = doc.rendezVous.length;
            let status = 'Disponible';
            if (isOnLeave) status = 'En congé';
            else if (count >= 15) status = 'Complet';
            else if (count >= 8) status = 'Chargé';

            return {
                id: doc.id,
                nom: doc.utilisateur.nom,
                prenom: doc.utilisateur.prenom,
                fullName: `Dr. ${doc.utilisateur.prenom} ${doc.utilisateur.nom}`,
                specialite: doc.specialite,
                status,
                workload: count
            };
        }));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/cardiology', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    req.query.specialite = 'Cardiologie';
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const doctors = await prisma.medecin.findMany({
            where: { specialite: 'Cardiologie' },
            include: {
                utilisateur: true,
                conges: { where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } } },
                rendezVous: { where: { date: { gte: startOfDay, lte: endOfDay }, statut: { not: 'ANNULE' } } }
            }
        });

        return res.json(doctors.map(doc => {
            const isOnLeave = doc.conges.length > 0;
            const count = doc.rendezVous.length;
            let status = 'Disponible';
            if (isOnLeave) status = 'En congé';
            else if (count >= 15) status = 'Complet';
            else if (count >= 8) status = 'Chargé';

            return {
                id: doc.id,
                nom: doc.utilisateur.nom,
                prenom: doc.utilisateur.prenom,
                email: doc.utilisateur.email,
                fullName: `Dr. ${doc.utilisateur.prenom} ${doc.utilisateur.nom}`,
                specialite: doc.specialite,
                statut: status,
                patientsCount: count,
                maxPatients: 15,
                appointments: doc.rendezVous.map(a => ({
                    id: a.id,
                    time: a.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    isUrgent: a.isUrgent,
                    presenceStatus: a.presenceStatus
                }))
            };
        }));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/tactical-stats', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const isSousAdmin = req.role === 'SOUS_ADMIN';
        let sa: any = null;
        if (isSousAdmin) {
            sa = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        }

        const statsAppointments = await prisma.rendezVous.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                ...(isSousAdmin && sa ? {
                    sousAdminId: sa.id,
                    ...(sa.specialite ? {
                        OR: [
                            { specialite: sa.specialite },
                            { specialite: sa.specialite.toLowerCase() }
                        ]
                    } : {})
                } : {})
            }
        });

        return res.json({
            total: statsAppointments.length,
            pending: statsAppointments.filter(a => a.presenceStatus === 'PREVU' && a.statut === 'CONFIRME').length,
            present: statsAppointments.filter(a => a.presenceStatus === 'PRESENT').length,
            urgent: statsAppointments.filter(a => a.isUrgent).length,
            late: statsAppointments.filter(a => a.presenceStatus === 'EN_RETARD').length,
            absent: statsAppointments.filter(a => a.presenceStatus === 'ABSENT').length
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/all-appointments', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        const isSousAdmin = req.role === 'SOUS_ADMIN';
        let sa: any = null;
        if (isSousAdmin) {
            sa = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        }

        const appointments = await prisma.rendezVous.findMany({
            where: {
                ...(isSousAdmin && sa ? {
                    sousAdminId: sa.id,
                    ...(sa.specialite ? {
                        OR: [
                            { specialite: sa.specialite },
                            { specialite: sa.specialite.toLowerCase() }
                        ]
                    } : {})
                } : {})
            },
            include: {
                medecin: { include: { utilisateur: true } },
                patient: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        return res.json(appointments.map(apt => ({
            id: apt.id,
            date: apt.date.toISOString().split('T')[0],
            time: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            doctor: apt.medecin
                ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                : 'À définir',
            specialty: apt.medecin?.specialite || '',
            motif: apt.motif || '',
            status: apt.statut,
            isUrgent: apt.isUrgent,
            presenceStatus: apt.presenceStatus,
            lieu: apt.lieu,
            salle: apt.salle
        })));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
