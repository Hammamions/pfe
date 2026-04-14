import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePatient, AuthRequest } from '../middleware/auth';
import { normalizeSpecialty } from '../utils/specialty';

const router = Router();

const ONE_HOUR_MS = 60 * 60 * 1000;

const hasPatientOneHourConflict = async ({
    patientId,
    date,
    excludeAppointmentId
}: {
    patientId: number;
    date: Date;
    excludeAppointmentId?: number;
}) => {
    const windowStart = new Date(date.getTime() - ONE_HOUR_MS);
    const windowEnd = new Date(date.getTime() + ONE_HOUR_MS);
    const conflict = await prisma.rendezVous.findFirst({
        where: {
            patientId,
            statut: { not: 'ANNULE' as any },
            date: { gte: windowStart, lte: windowEnd },
            ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
        },
        select: { id: true }
    });
    return !!conflict;
};

router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const now = new Date();
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const threshold = new Date(now.getTime() - (30 * 60 * 1000));
        const overdue = await prisma.rendezVous.findMany({
            where: {
                patientId: patient.id,
                date: { gte: startOfDay, lte: threshold },
                statut: { in: ['CONFIRME', 'EN_COURS'] as any }
            },
            include: {
                patient: {
                    include: {
                        salleAttente: {
                            where: { joinedAt: { gte: startOfDay } }
                        }
                    }
                }
            }
        });
        for (const apt of overdue) {
            const isPresent = apt.patient.salleAttente.some(sa => sa.presenceStatus === 'PRESENT');
            if (isPresent) continue;
            await prisma.rendezVous.update({
                where: { id: apt.id },
                data: { statut: 'TERMINE' as any }
            });
            const marker = `#${apt.id}`;
            const existingNotif = await prisma.notification.findFirst({
                where: {
                    utilisateurId: req.userId as number,
                    titre: '⚠️ Absence rendez-vous',
                    message: { contains: marker }
                },
                select: { id: true }
            });
            if (!existingNotif) {
                await prisma.notification.create({
                    data: {
                        utilisateurId: req.userId as number,
                        titre: '⚠️ Absence rendez-vous',
                        message: `Absence constatée pour le rendez-vous ${marker}. Le délai de 30 minutes est dépassé, le rendez-vous est clos automatiquement.`
                    }
                });
            }
        }

        const appointments = await prisma.rendezVous.findMany({
            where: { patientId: patient.id },
            include: {
                medecin: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        const formatted = appointments.map(apt => {
            const dateObj = new Date(apt.date);
            let status = apt.statut.toLowerCase();
            const isPlanned =
                !!apt.medecinId &&
                (apt.statut === 'CONFIRME' ||
                    (apt.statut as any) === 'EN_COURS' ||
                    (apt.statut as any) === 'TERMINE');
            if (!isPlanned && apt.statut === 'CONFIRME') status = 'en_attente';
           
            if ((apt.statut as any) === 'TERMINE') status = 'termine';
            else if ((apt.statut as any) === 'EN_COURS') status = 'en_cours';
            else if ((apt.statut as any) === 'ANNULE') status = 'termine';
            if (apt.motif?.startsWith('[ANNULER]')) status = 'demande_annulation';
            const hasDocuments = /\[DOC:1\]/.test(apt.motif || '');
            const documentNameMatch = (apt.motif || '').match(/\[DOC_NAME:([^\]]+)\]/);
            const documentName = documentNameMatch ? documentNameMatch[1] : null;

            return {
                id: apt.id,
                date: isPlanned ? dateObj.getDate().toString() : '',
                month: isPlanned ? dateObj.toLocaleString('fr-FR', { month: 'short' }).replace('.', '') : '',
                year: isPlanned ? dateObj.getFullYear().toString() : '',
                time: isPlanned ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
                doctor: apt.medecin
                    ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                    : 'Médecin à définir',
                specialty: apt.medecin?.specialite || (apt.motif?.includes('[SPEC:') ? apt.motif.split('[SPEC:')[1].split(']')[0] : ''),
                location: isPlanned ? (apt.lieu || 'À définir') : 'À définir',
                room: isPlanned ? (apt.salle || 'À définir') : 'À définir',
                status,
                isPlanned,
                motif: apt.motif
                    ? apt.motif
                        .replace(/\[SPEC:.*?\]/, '')
                        .replace(/\[REPORT\]/g, '')
                        .replace('[ANNULER]', '')
                        .replace(/\[PRESENT:1\]/g, '')
                        .replace(/\[URGENT:(?:0|1)\]/g, '')
                        .replace(/\[DOC:1\]/g, '')
                        .replace(/\[DOC_NAME:[^\]]+\]/g, '')
                        .replace(/\[DOC_TRAITE:1\]/g, '')
                        .trim()
                    : '',
                hasDocuments,
                documentName,
            };
        });

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { doctorId, reason, date, hasDocuments, documentName } = req.body;
    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const appointmentDate = date
            ? new Date(date)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const hasConflict = await hasPatientOneHourConflict({
            patientId: patient.id,
            date: appointmentDate
        });
        if (hasConflict) {
            return res.status(409).json({ error: 'Conflit planning: vous avez déjà un rendez-vous à moins de 1 heure.' });
        }

        const specialty = req.body.specialty || '';
        const docsFlag = hasDocuments ? ' [DOC:1]' : '';
        const docsName = hasDocuments && documentName ? ` [DOC_NAME:${documentName}]` : '';
        const finalMotif = `${specialty ? `[SPEC:${specialty}] ` : ''}${reason || ''}${docsFlag}${docsName}`.trim();

        let assignedSousAdminId: number | null = null;
        let specialtySousAdmins: any[] = [];
        const normalizedSpecialty = normalizeSpecialty(specialty);

        if (normalizedSpecialty) {
            const allSousAdminsWithWorkload = await prisma.sousAdmin.findMany({
                where: {
                    specialite: { not: null }
                },
                include: {
                    utilisateur: true,
                    _count: {
                        select: {
                            rendezVousGeres: {
                                where: { statut: { in: ['EN_ATTENTE', 'CONFIRME', 'REPORTE'] as any } }
                            }
                        }
                    }
                }
            });

            specialtySousAdmins = allSousAdminsWithWorkload.filter((sa: any) =>
                normalizeSpecialty(sa.specialite) === normalizedSpecialty
            );

            if (specialtySousAdmins.length > 0) {
                const sortedCandidates = [...specialtySousAdmins].sort((a: any, b: any) => {
                    const countA = a._count.rendezVousGeres;
                    const countB = b._count.rendezVousGeres;
                    if (countA !== countB) return countA - countB;
                    return a.id - b.id;
                });

                assignedSousAdminId = sortedCandidates[0].id;
            }
        }

        console.log(`[Backend] Creating appointment for patientId: ${patient.id}, userId: ${req.userId}`);
        const newApt = await prisma.rendezVous.create({
            data: {
                patientId: patient.id,
                medecinId: doctorId ? parseInt(doctorId) : null,
                motif: finalMotif || null,
                specialite: specialty || null,
                date: appointmentDate,
                statut: 'EN_ATTENTE',
                sousAdminId: assignedSousAdminId
            }
        });
        console.log(`[Backend] Appointment created successfully with ID: ${newApt.id} (Assigned to SA: ${assignedSousAdminId})`);


        if (assignedSousAdminId) {
            const sa = specialtySousAdmins.find(admin => admin.id === assignedSousAdminId);
            if (sa) {
                await prisma.notification.create({
                    data: {
                        utilisateurId: sa.utilisateur.id,
                        titre: '📌 Nouvelle demande assignée',
                        message: `Le patient ${patient.utilisateur.prenom} ${patient.utilisateur.nom} a envoyé une demande en ${specialty}. Elle vous a été automatiquement assignée.`
                    }
                });
            }
        }

        return res.status(201).json({ message: 'Demande de rendez-vous reçue', appointment: newApt });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.put('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, requestType, date: newDate } = req.body;

    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const appointment = await prisma.rendezVous.findFirst({
            where: { id: parseInt(id as string), patientId: patient.id }
        });
        if (!appointment) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        const requestedStatus = String(status || '').toUpperCase();
        let finalStatus: any = requestedStatus;
        let finalMotif = appointment.motif;
        let finalDate = appointment.date;

        if (newDate) finalDate = new Date(newDate);

        if (newDate) {
            const hasConflict = await hasPatientOneHourConflict({
                patientId: patient.id,
                date: finalDate,
                excludeAppointmentId: parseInt(id as string)
            });
            if (hasConflict) {
                return res.status(409).json({ error: 'Conflit planning: vous avez déjà un rendez-vous à moins de 1 heure.' });
            }
        }

        if (requestedStatus === 'ANNULE') {
            finalStatus = 'REPORTE';
            if (!(appointment.motif || '').startsWith('[ANNULER]')) {
                finalMotif = `[ANNULER] ${appointment.motif || ''}`;
            }
        } else if (requestedStatus === 'REPORTE' || String(requestType || '').toLowerCase() === 'reschedule') {
            finalStatus = 'REPORTE';
            if (!(appointment.motif || '').startsWith('[REPORT]')) {
                finalMotif = `[REPORT] ${appointment.motif || ''}`;
            }
        }

        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(id as string) },
            data: { statut: finalStatus, motif: finalMotif, date: finalDate }
        });

      
        if ((requestedStatus === 'ANNULE' || requestedStatus === 'REPORTE') && appointment.sousAdminId) {
            const sa = await prisma.sousAdmin.findUnique({
                where: { id: appointment.sousAdminId },
                include: { utilisateur: true }
            });
            if (sa?.utilisateurId) {
                const demandLabel = requestedStatus === 'ANNULE' ? "d'annulation" : 'de report';
                await prisma.notification.create({
                    data: {
                        utilisateurId: sa.utilisateurId,
                        titre: '📌 Nouvelle demande patient',
                        message: `Le patient a envoyé une demande ${demandLabel} du rendez-vous #${appointment.id}.`
                    }
                });
            }
        }

        return res.json({ message: 'Statut mis à jour', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});


router.delete('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        await prisma.rendezVous.deleteMany({
            where: { id: parseInt(id as string), patientId: patient.id }
        });

        return res.json({ message: 'Rendez-vous supprimé' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
