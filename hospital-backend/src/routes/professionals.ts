import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateProfessional, AuthRequest } from '../middleware/auth';
import { ensureSalleAttenteForTodaysAppointments } from '../utils/salleAttenteSync';
import { normalizeSpecialty } from '../utils/specialty';

const router = Router();

// normalizeSpecialty is imported from ../utils/specialty


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
            include: {
                utilisateur: true,
                conges: { where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } } },
                rendezVous: {
                    where: { date: { gte: startOfDay, lte: endOfDay }, statut: { not: 'ANNULE' } }
                }
            }
        });
        const targetSpecialty = normalizeSpecialty(
            (isSousAdmin && sa?.specialite) ? sa.specialite : (specialite as string | undefined)
        );
        const filteredDoctors = targetSpecialty
            ? doctors.filter((doc) => normalizeSpecialty(doc.specialite) === targetSpecialty)
            : doctors;

        return res.json(filteredDoctors.map(doc => {
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
            include: {
                utilisateur: true,
                conges: { where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } } },
                rendezVous: { where: { date: { gte: startOfDay, lte: endOfDay }, statut: { not: 'ANNULE' } } }
            }
        });
        const filteredDoctors = doctors.filter(
            (doc) => normalizeSpecialty(doc.specialite) === normalizeSpecialty('Cardiologie')
        );

        return res.json(filteredDoctors.map(doc => {
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

        const queueStats = await prisma.salleAttente.findMany({
            where: {
                sousAdminId: isSousAdmin && sa ? sa.id : undefined,
                joinedAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        const totalCount = await prisma.rendezVous.count({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                ...(isSousAdmin && sa ? { sousAdminId: sa.id } : {})
            }
        });

        return res.json({
            total: totalCount,
            pending: queueStats.filter(a => a.presenceStatus === 'PREVU' && a.status === 'EN_ATTENTE').length,
            present: queueStats.filter(a => a.presenceStatus === 'PRESENT').length,
            urgent: queueStats.filter(a => a.isUrgent).length,
            late: queueStats.filter(a => a.presenceStatus === 'EN_RETARD').length,
            absent: queueStats.filter(a => a.presenceStatus === 'ABSENT').length
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

        if (isSousAdmin && sa) {
            await ensureSalleAttenteForTodaysAppointments(prisma, sa.id);
        }

        const appointments = await prisma.rendezVous.findMany({
            where: {
                ...(isSousAdmin && sa ? {
                    OR: [
                        { sousAdminId: sa.id },
                        { sousAdminId: null }
                    ]
                } : {})
            },
            include: {
                medecin: { include: { utilisateur: true } },
                patient: {
                    include: {
                        utilisateur: true,
                        salleAttente: {
                            orderBy: { joinedAt: 'desc' },
                            take: 1
                        }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        const saSpecNormalized = normalizeSpecialty(sa?.specialite);
        const filtered = (isSousAdmin && sa) ? appointments.filter(apt => {
            if (apt.sousAdminId === sa.id) return true;
            if (apt.sousAdminId === null && normalizeSpecialty(apt.specialite) === saSpecNormalized) return true;
            return false;
        }) : appointments;

        return res.json(filtered.map((apt: any) => {
            const rawMotif = apt.motif || '';
            const requestType = apt.statut !== 'ANNULE' && rawMotif.includes('[ANNULER]')
                ? 'ANNULATION'
                : apt.statut !== 'ANNULE' && rawMotif.includes('[REPORT]')
                    ? 'REPORT'
                    : null;
            const cleanMotif = rawMotif
                .replace(/\[SPEC:[^\]]+\]/g, '')
                .replace(/\[ANNULER\]/g, '')
                .replace(/\[REPORT\]/g, '')
                .replace(/\[DOC:1\]/g, '')
                .replace(/\[DOC_NAME:[^\]]+\]/g, '')
                .trim();

            return {
                id: apt.id,
                patientId: apt.patientId,
                date: apt.date.toISOString().split('T')[0],
                time: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
                doctor: apt.medecin
                    ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                    : 'À définir',
                specialty: apt.medecin?.specialite || apt.specialite || '',
                motif: cleanMotif,
                status: apt.statut,
                statut: apt.statut, // Keep both for safety
                requestType,
                lieu: apt.lieu,
                salle: apt.salle,
                presenceStatus: apt.patient.salleAttente?.[0]?.presenceStatus || 'PREVU',
                isUrgent: apt.patient.salleAttente?.[0]?.isUrgent || false
            };
        }));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/doctor-waiting-room', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

        const appointments = await prisma.rendezVous.findMany({
            where: {
                medecinId: medecin.id,
                statut: { in: ['CONFIRME', 'EN_COURS'] as any },
                date: { gte: startOfDay, lte: endOfDay }
            },
            include: {
                patient: {
                    include: {
                        utilisateur: true,
                        dossierMedical: true,
                        salleAttente: {
                            where: {
                                joinedAt: { gte: startOfDay, lte: endOfDay }
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        const waiting = appointments.filter((apt: any) =>
            apt.patient?.salleAttente?.some((sa: any) => sa.presenceStatus === 'PRESENT')
        );

        return res.json(waiting.map((apt: any) => ({
            id: apt.id,
            patientId: apt.patientId,
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            motif: apt.motif || 'Consultation',
            heure: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            lieu: apt.lieu || 'À définir',
            salle: apt.salle || 'À définir',
            dossierMedical: {
                bloodGroup: apt.patient.dossierMedical?.groupeSanguin || 'Non précisé',
                allergies: apt.patient.dossierMedical?.allergies || [],
                history: apt.patient.dossierMedical?.historiqueMedical || [],
                socialSecurity: apt.patient.dossierMedical?.numSecuriteSociale || ''
            }
        })));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
