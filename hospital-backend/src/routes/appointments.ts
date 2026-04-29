import crypto from 'crypto';
import { Response, Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authenticatePatient, AuthRequest } from '../middleware/auth';
import { formatAppointmentCalendarParts, formatAppointmentTime } from '../utils/appointmentDisplay';
import {
    upsertPreVisitAttend,
    upsertPreVisitRescheduleAsk
} from '../utils/appointmentReminderRunner';
import { normalizeSpecialty } from '../utils/specialty';

const router = Router();

const uploadsRoot = path.join(process.cwd(), 'uploads', 'rdv-attachments');
fs.mkdirSync(uploadsRoot, { recursive: true });

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsRoot);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '') || '.bin';
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
});

const uploadAttachmentMw = multer({
    storage: uploadStorage,
    limits: { fileSize: 15 * 1024 * 1024 }
});

router.post(
    '/upload-attachment',
    authenticatePatient,
    uploadAttachmentMw.single('file'),
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Fichier requis (champ « file »)' });
            }
            const host = req.get('host') || 'localhost:4000';
            const xfProto = req.headers['x-forwarded-proto'];
            const proto = (Array.isArray(xfProto) ? xfProto[0] : xfProto) || req.protocol || 'http';
            const base = (process.env.PUBLIC_API_URL || `${proto}://${host}`).replace(/\/$/, '');
            const documentUrl = `${base}/api/uploads/rdv-attachments/${req.file.filename}`;
            return res.status(201).json({ documentUrl });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur lors de l’upload' });
        }
    }
);

const isDatabaseUnavailableError = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P1001';

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
                    titre: ' Absence rendez-vous',
                    message: { contains: marker }
                },
                select: { id: true }
            });
            if (!existingNotif) {
                await prisma.notification.create({
                    data: {
                        utilisateurId: req.userId as number,
                        titre: ' Absence rendez-vous',
                        message: `Absence constatée pour le rendez-vous. Le délai de 30 minutes est dépassé, le rendez-vous est clos automatiquement.`
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

        // Search for relevant "chained" slot offers in notifications
        const notifications = await prisma.notification.findMany({
            where: {
                utilisateurId: req.userId as number,
                message: { contains: '[[RDV_CHAIN:' }
            }
        });

        console.log(`[DEBUG] Fetching appointments for user ${req.userId}. Found ${appointments.length} appointments.`);

        const formatted = await Promise.all(appointments.map(async (apt) => {
            const dateObj = new Date(apt.date);
            const cal = formatAppointmentCalendarParts(dateObj);
            let status = apt.statut.toLowerCase();
            const isPlanned =
                !!apt.medecinId &&
                (apt.statut === 'CONFIRME' ||
                    (apt.statut as any) === 'EN_COURS' ||
                    (apt.statut as any) === 'TERMINE');
            if (!isPlanned && apt.statut === 'CONFIRME') status = 'en_attente';


            if ((apt.statut as any) === 'EN_ATTENTE' && (apt.motif?.startsWith('[ANNULER]') || apt.motif?.startsWith('[REPORT]'))) {
                status = 'en_attente';
            } else if (apt.motif?.startsWith('[ANNULER]')) status = 'demande_annulation';
            else if (apt.motif?.startsWith('[REPORT]')) status = 'reporte';
            else if ((apt.statut as any) === 'TERMINE') status = 'termine';
            else if ((apt.statut as any) === 'EN_COURS') status = 'en_cours';
            else if ((apt.statut as any) === 'ANNULE') status = 'termine';
            else if ((apt.statut as any) === 'REPORTE') status = 'reporte';
            const hasDocuments = /\[DOC:1\]/.test(apt.motif || '');
            const documentNameMatch = (apt.motif || '').match(/\[DOC_NAME:([^\]]+)\]/);
            const documentName = documentNameMatch ? documentNameMatch[1] : null;
            const rawMotif = apt.motif || '';
            const msUntilStart = dateObj.getTime() - Date.now();
            const needsPreVisitConfirmation =
                isPlanned &&
                apt.statut === 'CONFIRME' &&
                msUntilStart > 0 &&
                msUntilStart <= 125 * 60 * 1000 &&
                !/\[PREVISIT:ATTEND\]/.test(rawMotif) &&
                !/\[PREVISIT:ASK_RESCHEDULE\]/.test(rawMotif);

            // Check for earlier slot offer
            let earlierSlot: { date: string, offeringId: number } | null = null;
            const chainMarkerSuffix = `:${apt.id}]]`;
            const myChainNotif = notifications.find(n => n.message.includes(chainMarkerSuffix));
            if (myChainNotif) {
                console.log(`[DEBUG] Found potential chain notif for apt ${apt.id}: ${myChainNotif.message}`);
                const match = myChainNotif.message.match(/\[\[RDV_CHAIN:(\d+):(\d+)\]\]/);
                if (match && parseInt(match[2]) === apt.id) {
                    const offeringId = parseInt(match[1]);
                    const offeringApt = await prisma.rendezVous.findUnique({
                        where: { id: offeringId },
                        select: { date: true }
                    });
                    if (offeringApt) {
                        earlierSlot = {
                            date: offeringApt.date.toISOString(),
                            offeringId
                        };
                        console.log(`[DEBUG] Attached earlierSlot to apt ${apt.id}: ${earlierSlot.date}`);
                    }
                }
            }

            return {
                id: apt.id,
                date: isPlanned ? cal.day : '',
                month: isPlanned ? cal.month : '',
                year: isPlanned ? cal.year : '',
                time: isPlanned ? formatAppointmentTime(dateObj) : '',
                startsAtIso: isPlanned ? dateObj.toISOString() : null,
                needsPreVisitConfirmation,
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

                        .replace(/\[[^\]]+\]/g, ' ')
                        .replace(/\s{2,}/g, ' ')
                        .trim()
                    : '',
                hasDocuments,
                documentName,
                earlierSlot
            };
        }));

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        if (isDatabaseUnavailableError(error)) {
            return res.status(503).json({ error: "Base de données temporairement indisponible. Réessayez dans quelques instants." });
        }
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

        const specialty = req.body.specialty || '';
        const docsFlag = hasDocuments ? ' [DOC:1]' : '';
        const docsName = hasDocuments && documentName ? ` [DOC_NAME:${documentName}]` : '';
        const rawDocUrl = typeof req.body.documentUrl === 'string' ? req.body.documentUrl.trim() : '';
        const docsUrl =
            hasDocuments && rawDocUrl
                ? ` [DOC_URL:${encodeURIComponent(rawDocUrl)}]`
                : '';
        const finalMotif = `${specialty ? `[SPEC:${specialty}] ` : ''}${reason || ''}${docsFlag}${docsName}${docsUrl}`.trim();

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


async function notifyNextPatientOfAvailableSlot(appointment: any, options: { afterDate?: Date } = {}) {
    const dayStart = new Date(appointment.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const startAfter = options.afterDate || appointment.date;

    let nextApt: any = null;
    if (appointment.medecinId || appointment.sousAdminId) {
        const nextWhere: any = {
            id: { not: appointment.id },
            date: { gt: startAfter, gte: dayStart, lt: dayEnd },
            statut: 'CONFIRME' as any
        };
        if (appointment.medecinId) {
            nextWhere.medecinId = appointment.medecinId;
        } else if (appointment.sousAdminId) {
            nextWhere.sousAdminId = appointment.sousAdminId;
        }
        nextApt = await prisma.rendezVous.findFirst({
            where: nextWhere,
            orderBy: { date: 'asc' },
            include: { patient: { include: { utilisateur: true } } }
        });
    }
    if (nextApt?.patient?.utilisateurId) {
        const chainMarker = `[[RDV_CHAIN:${appointment.id}:${nextApt.id}]]`;
        const existingChain = await prisma.notification.findFirst({
            where: {
                utilisateurId: nextApt.patient.utilisateurId,
                message: { contains: chainMarker }
            },
            select: { id: true }
        });
        if (!existingChain) {
            await prisma.notification.create({
                data: {
                    utilisateurId: nextApt.patient.utilisateurId,
                    titre: '📅 Créneau plus tôt disponible',
                    message: `Un patient avant vous souhaite reporter son rendez-vous. Souhaitez-vous prendre sa place à son heure initiale ou garder votre créneau actuel ? Ouvrez le rendez-vous pour donner votre accord. ${chainMarker}`
                }
            });
        }
    }
}

router.put('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, requestType, date: newDate, preVisitIntent, swapChoice } = req.body;

    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const appointment = await prisma.rendezVous.findFirst({
            where: { id: parseInt(id as string), patientId: patient.id }
        });
        if (!appointment) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        if (swapChoice === 'ACCEPT' || swapChoice === 'DECLINE') {
            const chainNotif = await prisma.notification.findFirst({
                where: {
                    utilisateurId: req.userId as number,
                    message: { contains: `:${id}]]` }
                }
            });

            if (chainNotif) {
                if (swapChoice === 'ACCEPT') {
                    const match = chainNotif.message.match(/\[\[RDV_CHAIN:(\d+):(\d+)\]\]/);
                    if (match && match[2] && parseInt(match[2]) === parseInt(id as string)) {
                        const offeringId = parseInt(match[1]);
                        const offeringApt = await prisma.rendezVous.findUnique({
                            where: { id: offeringId }
                        });
                        if (offeringApt) {
                            // Move current patient to the earlier slot
                            await prisma.rendezVous.update({
                                where: { id: parseInt(id as string) },
                                data: {
                                    statut: 'EN_ATTENTE',
                                    date: offeringApt.date,
                                    motif: `[SWAP_ACCEPT] [SWAP_FROM:${appointment.date.toISOString()}] ${appointment.motif || ''}`.trim()
                                }
                            });

                            // The current patient's ORIGINAL slot is now vacant! Offer it to the next person.
                            // We use the original appointment object which has the old date.
                            await notifyNextPatientOfAvailableSlot(appointment);

                            if (appointment.sousAdminId) {
                                const sa = await prisma.sousAdmin.findUnique({
                                    where: { id: appointment.sousAdminId },
                                    include: { utilisateur: true }
                                });
                                if (sa?.utilisateurId) {
                                    await prisma.notification.create({
                                        data: {
                                            utilisateurId: sa.utilisateurId,
                                            titre: '📌 Proposition de créneau acceptée',
                                            message: `Un patient a accepté d'avancer son rendez-vous à ${offeringApt.date.toLocaleTimeString('fr-FR')}. Veuillez valider la demande.`
                                        }
                                    });
                                }
                            }
                        }
                    }
                } else if (swapChoice === 'DECLINE') {
                    // Current patient declined the earlier slot. Pass it to the next person.
                    const match = chainNotif.message.match(/\[\[RDV_CHAIN:(\d+):(\d+)\]\]/);
                    if (match) {
                        const offeringId = parseInt(match[1]);
                        const offeringApt = await prisma.rendezVous.findUnique({
                            where: { id: offeringId }
                        });
                        if (offeringApt) {
                            // Notify next patient AFTER current appointment
                            await notifyNextPatientOfAvailableSlot(offeringApt, { afterDate: appointment.date });
                        }
                    }
                }

                await prisma.notification.delete({ where: { id: chainNotif.id } });
                const refreshed = await prisma.rendezVous.findUnique({ where: { id: parseInt(id as string) } });
                return res.json({
                    message: swapChoice === 'ACCEPT' ? 'Rendez-vous avancé avec succès' : 'Offre déclinée',
                    appointment: { ...refreshed, earlierSlot: null }
                });
            }
        }

        const rawIntent = typeof preVisitIntent === 'string' ? preVisitIntent.toUpperCase() : '';
        if (rawIntent === 'WILL_ATTEND' || rawIntent === 'WANT_RESCHEDULE') {
            if (appointment.statut !== 'CONFIRME') {
                return res.status(400).json({ error: 'Cette action concerne uniquement un rendez-vous confirmé.' });
            }
            const msUntil = new Date(appointment.date).getTime() - Date.now();
            if (msUntil <= 0 || msUntil > 130 * 60 * 1000) {
                return res.status(400).json({
                    error: 'Cette action est disponible dans les 2 heures avant l’heure du rendez-vous.'
                });
            }

            if (rawIntent === 'WILL_ATTEND') {
                if (/\[PREVISIT:ATTEND\]/.test(appointment.motif || '')) {
                    return res.json({ message: 'Présence déjà enregistrée', appointment });
                }
                const motifWithPresenceTag = upsertPreVisitAttend(appointment.motif);
                const updatedPv = await prisma.rendezVous.update({
                    where: { id: appointment.id },
                    data: { motif: motifWithPresenceTag }
                });

                await prisma.notification.create({
                    data: {
                        utilisateurId: patient.utilisateurId,
                        titre: '✅ Présence enregistrée',
                        message: `Merci : nous avons bien noté votre présence pour le rendez-vous.`
                    }
                });
                return res.json({ message: 'Présence enregistrée', appointment: updatedPv });
            }

            if (rawIntent === 'WANT_RESCHEDULE') {
                if (!/\[PREVISIT:ASK_RESCHEDULE\]/.test(appointment.motif || '')) {
                    const newMotif = `[REPORT] ${upsertPreVisitRescheduleAsk(appointment.motif)}`.replace(/\s{2,}/g, ' ').trim();
                    await prisma.rendezVous.update({
                        where: { id: appointment.id },
                        data: {
                            statut: 'EN_ATTENTE',
                            motif: newMotif
                        }
                    });
                    await prisma.notification.create({
                        data: {
                            utilisateurId: patient.utilisateurId,
                            titre: '📅 Changer l’heure',
                            message: `Pour reporter le rendez-vous, ouvrez le détail du rendez-vous puis utilisez « Demande de report ».`
                        }
                    });
                    if (appointment.sousAdminId) {
                        const sa = await prisma.sousAdmin.findUnique({
                            where: { id: appointment.sousAdminId },
                            include: { utilisateur: true }
                        });
                        if (sa?.utilisateurId) {
                            await prisma.notification.create({
                                data: {
                                    utilisateurId: sa.utilisateurId,
                                    titre: '⚠️ Patient : report souhaité',
                                    message: `Le patient souhaite reporter le rendez-vous (rappel avant venue).`
                                }
                            });
                        }
                    }

                    await notifyNextPatientOfAvailableSlot(appointment);
                }
                const refreshed = await prisma.rendezVous.findUnique({ where: { id: appointment.id } });
                return res.json({ message: 'Demande enregistrée', appointment: refreshed });
            }
        }

        const requestedStatus = String(status || '').toUpperCase();
        let finalStatus: any = requestedStatus;
        let finalMotif = appointment.motif;
        let finalDate = appointment.date;

        if (newDate) finalDate = new Date(newDate);

        if (requestedStatus === 'ANNULE') {
            finalStatus = 'EN_ATTENTE';
            if (!(appointment.motif || '').startsWith('[ANNULER]')) {
                finalMotif = `[ANNULER] ${appointment.motif || ''}`;
            }
        } else if (requestedStatus === 'REPORTE' || String(requestType || '').toLowerCase() === 'reschedule') {
            finalStatus = 'EN_ATTENTE';
            if (!(appointment.motif || '').startsWith('[REPORT]')) {
                finalMotif = `[REPORT] ${appointment.motif || ''}`;
            }
        }

        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(id as string) },
            data: { statut: finalStatus, motif: finalMotif, date: finalDate }
        });

        if (requestedStatus === 'REPORTE' || String(requestType || '').toLowerCase() === 'reschedule') {
            await notifyNextPatientOfAvailableSlot(appointment);
        }


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
                        message: `Le patient a envoyé une demande ${demandLabel} du rendez-vous.`
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