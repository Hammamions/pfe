import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateProfessional, AuthRequest } from '../middleware/auth';
import { ensureSalleAttenteForTodaysAppointments } from '../utils/salleAttenteSync';
import { normalizeSpecialty } from '../utils/specialty';

const router = Router();

const ABSENCE_NOTIFICATION_TITLE = '⚠️ Absence rendez-vous';

function parseDateQuery(value?: string): Date {
    if (!value) return new Date();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date(value);
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
}

function mergeDateAndTime(dateValue: string, timeValue?: string): Date {
    const base = parseDateQuery(dateValue);
    if (!timeValue) return base;
    const match = timeValue.match(/^(\d{2}):(\d{2})/);
    if (!match) return base;
    const [, hh, mm] = match;
    const merged = new Date(base);
    merged.setHours(Number(hh), Number(mm), 0, 0);
    return merged;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function autoCloseAbsentAppointments(params: {
    isSousAdmin: boolean;
    saId?: number;
}) {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const threshold = new Date(now.getTime() - (30 * 60 * 1000));

    const candidates = await prisma.rendezVous.findMany({
        where: {
            date: { gte: startOfDay, lte: threshold },
            statut: { in: ['CONFIRME', 'EN_COURS'] as any },
            ...(params.isSousAdmin && params.saId ? { sousAdminId: params.saId } : {})
        },
        include: {
            patient: {
                include: {
                    utilisateur: true,
                    salleAttente: {
                        where: { joinedAt: { gte: startOfDay, lte: endOfDay } }
                    }
                }
            }
        }
    });

    for (const apt of candidates) {
        const hasPresentEntry = apt.patient.salleAttente.some(sa => sa.presenceStatus === 'PRESENT');
        if (hasPresentEntry) continue;

        await prisma.rendezVous.update({
            where: { id: apt.id },
            data: { statut: 'TERMINE' as any }
        });

        await prisma.salleAttente.deleteMany({
            where: {
                patientId: apt.patientId,
                joinedAt: { gte: startOfDay, lte: endOfDay },
                ...(apt.sousAdminId ? { sousAdminId: apt.sousAdminId } : {})
            }
        });

        const marker = `#${apt.id}`;
        const existingNotif = await prisma.notification.findFirst({
            where: {
                utilisateurId: apt.patient.utilisateurId,
                titre: ABSENCE_NOTIFICATION_TITLE,
                message: { contains: marker }
            },
            select: { id: true }
        });
        if (!existingNotif) {
            await prisma.notification.create({
                data: {
                    utilisateurId: apt.patient.utilisateurId,
                    titre: ABSENCE_NOTIFICATION_TITLE,
                    message: `Absence constatée pour le rendez-vous ${marker}. Le délai de 30 minutes est dépassé, le rendez-vous est clos automatiquement.`
                }
            });
        }
    }
}


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
        const now = new Date();
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
        const isLiveMode = String(req.query.status || '').toLowerCase() === 'live';
        const isSousAdmin = req.role === 'SOUS_ADMIN';
        let sa: any = null;
        if (isSousAdmin) {
            sa = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        }

        await autoCloseAbsentAppointments({ isSousAdmin, saId: sa?.id });

        if (isSousAdmin && sa) {
            await ensureSalleAttenteForTodaysAppointments(prisma, sa.id);
        }

        const liveWhere = isLiveMode ? {
            OR: [
                { statut: 'EN_ATTENTE' as any },
                { motif: { contains: '[ANNULER]' }, statut: { not: 'ANNULE' as any } },
                { motif: { contains: '[REPORT]' }, statut: { not: 'ANNULE' as any } },
                {
                    date: { gte: startOfDay, lte: endOfDay },
                    statut: { in: ['CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE'] as any }
                }
            ]
        } : {};
        const scopeWhere = (isSousAdmin && sa) ? {
            OR: [
                { sousAdminId: sa.id },
                { sousAdminId: null }
            ]
        } : {};

        const appointments = await prisma.rendezVous.findMany({
            where: {
                AND: [
                    liveWhere as any,
                    scopeWhere as any
                ]
            },
            include: {
                medecin: { include: { utilisateur: true } },
                patient: {
                    include: {
                        utilisateur: true,
                        salleAttente: {
                            where: {
                                joinedAt: { gte: startOfDay, lte: endOfDay }
                            },
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
                .replace(/\[PRESENT:1\]/g, '')
                .replace(/\[URGENT:(?:0|1)\]/g, '')
                .replace(/\[DOC:1\]/g, '')
                .replace(/\[DOC_NAME:[^\]]+\]/g, '')
                .replace(/\[DOC_TRAITE:1\]/g, '')
                .trim();
            const hasDocuments = /\[DOC:1\]/.test(rawMotif);
            const documentsProcessed = /\[DOC_TRAITE:1\]/.test(rawMotif);
            const documentNameMatch = rawMotif.match(/\[DOC_NAME:([^\]]+)\]/);
            const isUrgentFromRdv = /\[URGENT:1\]/.test(rawMotif);
            const hasPresentTag = /\[PRESENT:1\]/.test(rawMotif);
            const waitingPresence = apt.patient.salleAttente?.[0]?.presenceStatus;
            const computedPresenceStatus =
                apt.statut === 'EN_COURS' || hasPresentTag
                    ? 'PRESENT'
                    : (waitingPresence === 'ABSENT' || waitingPresence === 'EN_RETARD')
                        ? waitingPresence
                        : 'PREVU';

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
                statut: apt.statut, 
                requestType,
                lieu: apt.lieu,
                salle: apt.salle,
                presenceStatus: computedPresenceStatus,
                isUrgent: isUrgentFromRdv,
                hasDocuments,
                documentsProcessed,
                documentName: documentNameMatch ? documentNameMatch[1] : null
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
                        dossierMedical: { include: { documents: true } },
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
            (apt.statut as any) === 'EN_COURS' || /\[PRESENT:1\]/.test(apt.motif || '')
        );

        return res.json(waiting.map((apt: any) => ({
            id: apt.id,
            patientId: apt.patientId,
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            patient: {
                prenom: apt.patient.utilisateur.prenom,
                nom: apt.patient.utilisateur.nom,
                email: apt.patient.utilisateur.email || '',
                telephone: apt.patient.telephone || '',
                dateNaissance: apt.patient.dossierMedical?.dateNaissance || '',
                groupeSanguin: apt.patient.dossierMedical?.groupeSanguin || 'Non précisé',
                numeroSecu: apt.patient.dossierMedical?.numSecuriteSociale || ''
            },
            motif: (apt.motif || 'Consultation')
                .replace(/\[SPEC:[^\]]+\]/g, '')
                .replace(/\[ANNULER\]/g, '')
                .replace(/\[REPORT\]/g, '')
                .replace(/\[PRESENT:1\]/g, '')
                .replace(/\[URGENT:(?:0|1)\]/g, '')
                .replace(/\[DOC:1\]/g, '')
                .replace(/\[DOC_NAME:[^\]]+\]/g, '')
                .replace(/\[DOC_TRAITE:1\]/g, '')
                .trim() || 'Consultation',
            heure: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            lieu: apt.lieu || 'À définir',
            salle: apt.salle || 'À définir',
            dossierMedical: {
                bloodGroup: apt.patient.dossierMedical?.groupeSanguin || 'Non précisé',
                allergies: apt.patient.dossierMedical?.allergies || [],
                history: apt.patient.dossierMedical?.historiqueMedical || [],
                socialSecurity: apt.patient.dossierMedical?.numSecuriteSociale || ''
            },
            allergies: apt.patient.dossierMedical?.allergies || [],
            antecedents: apt.patient.dossierMedical?.historiqueMedical || [],
            consultations: [],
            documents: apt.patient.dossierMedical?.documents || []
        })));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/doctor-agenda', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const targetDate = parseDateQuery(req.query.date as string | undefined);
        const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

        const appointments = await prisma.rendezVous.findMany({
            where: {
                medecinId: medecin.id,
                date: { gte: startOfDay, lte: endOfDay },
                statut: { not: 'ANNULE' as any }
            },
            include: {
                patient: {
                    include: {
                        utilisateur: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        return res.json(appointments.map((apt: any) => {
            const rawMotif = apt.motif || '';
            return {
                id: apt.id,
                date: formatLocalDate(apt.date),
                heure: apt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                duree: 30,
                statut: String(apt.statut || '').toLowerCase(),
                rescheduleStatus: (apt.statut as any) === 'REPORTE' || /\[REPORT\]/.test(rawMotif) ? 'pending' : null,
                salle: apt.salle || 'À définir',
                motif: rawMotif
                    .replace(/\[SPEC:[^\]]+\]/g, '')
                    .replace(/\[ANNULER\]/g, '')
                    .replace(/\[REPORT\]/g, '')
                    .replace(/\[PRESENT:1\]/g, '')
                    .replace(/\[URGENT:(?:0|1)\]/g, '')
                    .replace(/\[DOC:1\]/g, '')
                    .replace(/\[DOC_NAME:[^\]]+\]/g, '')
                    .replace(/\[DOC_TRAITE:1\]/g, '')
                    .trim() || 'Consultation',
                patient: {
                    id: apt.patientId,
                    nom: apt.patient.utilisateur.nom,
                    prenom: apt.patient.utilisateur.prenom
                }
            };
        }));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/doctor-agenda/:id/reschedule-request', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const appointmentId = Number(req.params.id);
        if (Number.isNaN(appointmentId)) {
            return res.status(400).json({ error: 'Identifiant de rendez-vous invalide' });
        }

        const { date, time } = req.body || {};
        if (!date) {
            return res.status(400).json({ error: 'Date de reprogrammation requise' });
        }

        const appointment = await prisma.rendezVous.findFirst({
            where: { id: appointmentId, medecinId: medecin.id },
            include: {
                patient: { include: { utilisateur: true } },
                sousAdmin: { include: { utilisateur: true } }
            }
        });
        if (!appointment) {
            return res.status(404).json({ error: 'Rendez-vous non trouvé pour ce médecin' });
        }

        const newDateTime = mergeDateAndTime(String(date), String(time || ''));
        const hasReportTag = /\[REPORT\]/.test(appointment.motif || '');
        const updated = await prisma.rendezVous.update({
            where: { id: appointment.id },
            data: {
                statut: 'REPORTE' as any,
                date: newDateTime,
                motif: hasReportTag ? appointment.motif : `[REPORT] ${appointment.motif || ''}`.trim()
            }
        });

        if (appointment.sousAdmin?.utilisateurId) {
            await prisma.notification.create({
                data: {
                    utilisateurId: appointment.sousAdmin.utilisateurId,
                    titre: '📌 Demande de report médecin',
                    message: `Le Dr a demandé le report du rendez-vous #${appointment.id} de ${appointment.patient.utilisateur.prenom} ${appointment.patient.utilisateur.nom}.`
                }
            });
        }

        return res.json({ message: 'Demande de reprogrammation envoyée', appointment: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
