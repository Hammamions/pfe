import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateSousAdmin, AuthRequest } from '../middleware/auth';
import { ensureSalleAttenteForTodaysAppointments, isDateToday } from '../utils/salleAttenteSync';
import { normalizeSpecialty } from '../utils/specialty';

const router = Router();

// normalizeSpecialty is imported from ../utils/specialty

const hasSchedulingConflict = async ({
    date,
    medecinId,
    lieu,
    salle,
    excludeAppointmentId
}: {
    date: Date;
    medecinId?: number | null;
    lieu?: string | null;
    salle?: string | null;
    excludeAppointmentId?: number;
}) => {
    const baseWhere: any = {
        statut: { in: ['CONFIRME', 'REPORTE'] },
        date,
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
    };

    if (medecinId) {
        const doctorConflict = await prisma.rendezVous.findFirst({
            where: { ...baseWhere, medecinId },
            select: { id: true }
        });
        if (doctorConflict) {
            return { type: 'doctor' as const, conflictId: doctorConflict.id };
        }
    }

    const cleanLieu = (lieu || '').trim();
    const cleanSalle = (salle || '').trim();
    if (cleanSalle && cleanSalle !== 'À définir') {
        const roomConflict = await prisma.rendezVous.findFirst({
            where: {
                ...baseWhere,
                salle: cleanSalle,
                ...(cleanLieu ? { lieu: cleanLieu } : {})
            },
            select: { id: true }
        });
        if (roomConflict) {
            return { type: 'room' as const, conflictId: roomConflict.id };
        }
    }

    return null;
};


router.get('/appointments', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { date, statut } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } }) as any;
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        if (isDateToday(startOfDay)) {
            await ensureSalleAttenteForTodaysAppointments(prisma, sousAdmin.id);
        }

        const appointments = await prisma.rendezVous.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                ...(statut ? { statut: statut as any } : {}),
                OR: [
                    { sousAdminId: sousAdmin.id },
                    { sousAdminId: null }
                ]
            },
            include: {
                patient: { include: { utilisateur: true } },
                medecin: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        // Robust matching for unassigned requests
        const saSpecNormalized = normalizeSpecialty(sousAdmin.specialite);
        const filtered = appointments.filter(apt => {
            if (apt.sousAdminId === sousAdmin.id) return true;
            if (apt.sousAdminId === null && normalizeSpecialty(apt.specialite) === saSpecNormalized) return true;
            return false;
        });

        const formatted = filtered.map(apt => ({
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
                OR: [
                    { sousAdminId: sousAdmin.id },
                    { sousAdminId: null }
                ]
            },
            include: {
                patient: { include: { utilisateur: true } },
                medecin: { include: { utilisateur: true } }
            },
            orderBy: [{ createdAt: 'asc' }]
        });

        const saSpecNormalized = normalizeSpecialty(sousAdmin.specialite);
        const filtered = appointments.filter(apt => {
            if (apt.sousAdminId === sousAdmin.id) return true;
            if (apt.sousAdminId === null && normalizeSpecialty(apt.specialite) === saSpecNormalized) return true;
            return false;
        });

        return res.json(filtered.map(apt => ({
            id: apt.id,
            patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
            patientId: apt.patientId,
            motif: apt.motif || '',
            specialite: apt.specialite || '',
            status: apt.statut,
            statut: apt.statut,
            requestedAt: apt.createdAt
        })));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/appointments/create', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { patientId, medecinId, date, motif, lieu, salle } = req.body;
    if (!patientId || !date) return res.status(400).json({ error: 'patientId et date sont requis' });

    try {
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });
        const finalDate = new Date(date);
        const parsedMedecinId = medecinId ? parseInt(medecinId) : null;
        const finalLieu = lieu || 'À définir';
        const finalSalle = salle || 'À définir';

        const conflict = await hasSchedulingConflict({
            date: finalDate,
            medecinId: parsedMedecinId,
            lieu: finalLieu,
            salle: finalSalle
        });
        if (conflict?.type === 'doctor') {
            return res.status(409).json({ error: 'Conflit planning: ce médecin a déjà un rendez-vous à ce créneau.' });
        }
        if (conflict?.type === 'room') {
            return res.status(409).json({ error: 'Conflit planning: cette salle est déjà occupée à ce créneau.' });
        }

        const apt = await prisma.rendezVous.create({
            data: {
                patientId: parseInt(patientId),
                medecinId: parsedMedecinId,
                sousAdminId: sousAdmin.id,
                date: finalDate,
                motif: motif || null,
                lieu: finalLieu,
                salle: finalSalle,
                statut: medecinId ? 'CONFIRME' : 'EN_ATTENTE',
                // presenceStatus removed as it's now in SalleAttente
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

        if (apt.statut === 'CONFIRME' && isDateToday(apt.date)) {
            await ensureSalleAttenteForTodaysAppointments(prisma, sousAdmin.id);
        }

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
        const appointmentId = parseInt(req.params.id as string);
        const current = await prisma.rendezVous.findUnique({ where: { id: appointmentId } });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        const finalDate = new Date(date);
        const finalMedecinId = medecinId ? parseInt(medecinId) : current.medecinId;
        const finalLieu = lieu || current.lieu || 'À définir';
        const finalSalle = salle || current.salle || 'À définir';

        const conflict = await hasSchedulingConflict({
            date: finalDate,
            medecinId: finalMedecinId,
            lieu: finalLieu,
            salle: finalSalle,
            excludeAppointmentId: appointmentId
        });
        if (conflict?.type === 'doctor') {
            return res.status(409).json({ error: 'Conflit planning: ce médecin a déjà un rendez-vous à ce créneau.' });
        }
        if (conflict?.type === 'room') {
            return res.status(409).json({ error: 'Conflit planning: cette salle est déjà occupée à ce créneau.' });
        }

        const updated = await prisma.rendezVous.update({
            where: { id: appointmentId },
            data: {
                date: finalDate,
                statut: 'CONFIRME',
                sousAdminId: sousAdmin.id,
                ...(finalMedecinId ? { medecinId: finalMedecinId } : {}),
                lieu: finalLieu,
                salle: finalSalle
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

        if (!isDateToday(finalDate)) {
            await prisma.salleAttente.deleteMany({
                where: { sousAdminId: sousAdmin.id, patientId: current.patientId }
            });
        } else {
            await ensureSalleAttenteForTodaysAppointments(prisma, sousAdmin.id);
        }

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
        const current = await prisma.rendezVous.findUnique({ where: { id: parseInt(req.params.id as string) } });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
        const appointmentId = parseInt(req.params.id as string);
        const finalDate = new Date(date);
        const finalMedecinId = parseInt(medecinId);
        const finalLieu = lieu || 'À définir';
        const finalSalle = salle || 'À définir';

        const conflict = await hasSchedulingConflict({
            date: finalDate,
            medecinId: finalMedecinId,
            lieu: finalLieu,
            salle: finalSalle,
            excludeAppointmentId: appointmentId
        });
        if (conflict?.type === 'doctor') {
            return res.status(409).json({ error: 'Conflit planning: ce médecin a déjà un rendez-vous à ce créneau.' });
        }
        if (conflict?.type === 'room') {
            return res.status(409).json({ error: 'Conflit planning: cette salle est déjà occupée à ce créneau.' });
        }

        const cleanedMotif = (current.motif || '')
            .replace(/\[ANNULER\]/g, '')
            .replace(/\[REPORT\]/g, '')
            .trim();

        const updated = await prisma.rendezVous.update({
            where: { id: appointmentId },
            data: {
                medecinId: finalMedecinId,
                date: finalDate,
                lieu: finalLieu,
                salle: finalSalle,
                statut: 'CONFIRME',
                motif: cleanedMotif || null,
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

        if (isDateToday(finalDate)) {
            await ensureSalleAttenteForTodaysAppointments(prisma, sousAdmin.id);
        }

        return res.json({ message: 'Rendez-vous assigné et confirmé', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

router.patch('/appointments/:id/reject-request', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const current = await prisma.rendezVous.findUnique({
            where: { id },
            include: { patient: { include: { utilisateur: true } } }
        });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        const cleanedMotif = (current.motif || '')
            .replace(/\[ANNULER\]/g, '')
            .replace(/\[REPORT\]/g, '')
            .trim();

        const updated = await prisma.rendezVous.update({
            where: { id },
            data: {
                statut: 'CONFIRME',
                motif: cleanedMotif || null,
                sousAdminId: sousAdmin.id
            },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: 'ℹ️ Demande traitée',
                message: "Votre demande d'annulation/report a été refusée. Le rendez-vous reste confirmé."
            }
        });

        return res.json({ message: 'Demande refusée, rendez-vous maintenu', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du traitement de la demande' });
    }
});


router.patch('/appointments/:id/presence', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { presenceStatus } = req.body;
    if (!presenceStatus) return res.status(400).json({ error: 'presenceStatus requis' });

    try {
        const appointmentId = parseInt(req.params.id as string);
        const current = await prisma.rendezVous.findUnique({ where: { id: appointmentId } });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        // Rule: Sequential queue - only one patient EN_COURS at a time per doctor
        // - First patient marked PRESENT becomes EN_COURS
        // - Subsequent patients marked PRESENT stay CONFIRME until previous is TERMINE
        let statutToSet = current.statut;

        if (presenceStatus === 'PRESENT') {
            // Check if there's already a patient EN_COURS for this doctor today
            const day = new Date(current.date);
            const startOfDay = new Date(day); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(day); endOfDay.setHours(23, 59, 59, 999);

            const existingInProgress = await prisma.rendezVous.findFirst({
                where: {
                    id: { not: appointmentId },
                    medecinId: current.medecinId,
                    statut: 'EN_COURS' as any,
                    date: { gte: startOfDay, lte: endOfDay }
                }
            });

            // If no one is EN_COURS, this patient becomes EN_COURS
            // Otherwise, stays CONFIRME (will be updated to EN_COURS when previous finishes)
            statutToSet = (existingInProgress as any) ? 'CONFIRME' : 'EN_COURS' as any;
        } else {
            // For other presence statuses (ABSENT, ANNULE, etc.)
            statutToSet = (current.statut as any) === 'TERMINE' ? 'TERMINE' as any : current.statut;
        }
        const updated = await prisma.rendezVous.update({
            where: { id: appointmentId },
            data: { statut: statutToSet as any },
            include: {
                patient: {
                    include: {
                        utilisateur: true,
                        dossierMedical: true
                    }
                },
                medecin: {
                    include: { utilisateur: true }
                }
            }
        });

        // Salle d'attente : toutes les lignes pour ce patientId
        const actingSa = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        const queueSousAdminId = updated.sousAdminId ?? actingSa?.id ?? null;
        if (presenceStatus === 'PRESENT') {
            const updatedRows = await prisma.salleAttente.updateMany({
                where: { patientId: updated.patientId },
                data: {
                    status: 'EN_CONSULTATION',
                    presenceStatus: presenceStatus as any,
                }
            });
            if (updatedRows.count === 0 && queueSousAdminId) {
                await prisma.salleAttente.create({
                    data: {
                        sousAdminId: queueSousAdminId,
                        patientId: updated.patientId,
                        status: 'EN_CONSULTATION',
                        presenceStatus: presenceStatus as any,
                    }
                });
            }
        } else {
            // For ABSENT/ANNULE/etc, we typically remove from queue
            await prisma.salleAttente.deleteMany({
                where: { patientId: updated.patientId }
            });
        }

        // When patient is marked present, push dossier summary to doctor.
        if (presenceStatus === 'PRESENT' && updated.medecin?.utilisateurId) {
            const dossier = updated.patient?.dossierMedical;
            const allergies = (dossier?.allergies || []).filter(Boolean).join(', ') || 'Aucune';
            const history = (dossier?.historiqueMedical || []).filter(Boolean).slice(0, 3).join(', ') || 'Aucun antécédent signalé';
            const blood = dossier?.groupeSanguin || 'Non précisé';
            const patientName = `${updated.patient.utilisateur.prenom} ${updated.patient.utilisateur.nom}`;

            await prisma.notification.create({
                data: {
                    utilisateurId: updated.medecin.utilisateurId,
                    titre: '🩺 Patient en salle d\'attente',
                    message: `${patientName} est présent. Groupe sanguin: ${blood}. Allergies: ${allergies}. Antécédents: ${history}.`
                }
            });
        }

        return res.json({ message: 'Statut de présence mis à jour', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.patch('/appointments/:id/urgent', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    const { isUrgent } = req.body;
    if (typeof isUrgent !== 'boolean') {
        return res.status(400).json({ error: 'isUrgent (booléen) requis' });
    }
    try {
        const appointmentId = parseInt(req.params.id as string);
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const current = await prisma.rendezVous.findUnique({ where: { id: appointmentId } });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
        if (current.sousAdminId && current.sousAdminId !== sousAdmin.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const updated = await prisma.salleAttente.updateMany({
            where: { patientId: current.patientId },
            data: { isUrgent }
        });
        return res.json({ message: 'Priorité mise à jour' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.patch('/appointments/:id/checkout', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const appointmentId = parseInt(req.params.id as string);
        const sousAdmin = await prisma.sousAdmin.findUnique({ where: { utilisateurId: req.userId } });
        if (!sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouvé' });

        const current = await prisma.rendezVous.findUnique({
            where: { id: appointmentId },
            include: { patient: { include: { utilisateur: true } } }
        });

        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
        if (current.sousAdminId && current.sousAdminId !== sousAdmin.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

        const currentEntry = await prisma.salleAttente.findFirst({
            where: {
                patientId: current.patientId,
                joinedAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        if (!currentEntry || currentEntry.presenceStatus !== 'PRESENT') {
            return res.status(400).json({ error: 'Le patient doit être marqué PRESENT avant la sortie.' });
        }

        const updated = await prisma.rendezVous.update({
            where: { id: appointmentId },
            data: { statut: 'TERMINE' as any },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: '✅ Consultation terminée',
                message: `Votre consultation du ${new Date(updated.date).toLocaleDateString('fr-FR')} est terminée.`
            }
        });

        const queueSid = current.sousAdminId ?? sousAdmin.id;
        await prisma.salleAttente.deleteMany({
            where: { sousAdminId: queueSid, patientId: current.patientId }
        });

        // Handle sequential queue: activate next patient when current one finishes
        if (current.medecinId) {
            const day = new Date(current.date);
            const startOfDay = new Date(day); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(day); endOfDay.setHours(23, 59, 59, 999);

            // Find next patient in queue: PRESENT but still CONFIRME (waiting for their turn)
            const nextCandidates = await prisma.rendezVous.findMany({
                where: {
                    id: { not: current.id },
                    medecinId: current.medecinId,
                    statut: 'CONFIRME',
                    date: { gte: startOfDay, lte: endOfDay }
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
                },
                orderBy: { date: 'asc' }
            });

            const next = nextCandidates.find(apt =>
                apt.patient.salleAttente.some(sa => sa.presenceStatus === 'PRESENT')
            );

            if (next?.patient?.utilisateurId) {
                // Update next patient to EN_COURS (now they can be checked out)
                await prisma.rendezVous.update({
                    where: { id: next.id },
                    data: { statut: 'EN_COURS' as any }
                });

                // Notify patient their appointment is starting
                await prisma.notification.create({
                    data: {
                        utilisateurId: next.patient.utilisateurId,
                        titre: '⏱️ Votre rendez-vous va débuter',
                        message: 'Merci de vous préparer, le médecin va vous recevoir dans quelques instants. Vous pouvez maintenant cliquer sur "Marquer sortie" à la fin de votre consultation.'
                    }
                });
            }
        }

        return res.json({ message: 'Rendez-vous terminé', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.patch('/appointments/:id/cancel', authenticateSousAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const current = await prisma.rendezVous.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
        const cleanedMotif = (current.motif || '')
            .replace(/\[ANNULER\]/g, '')
            .replace(/\[REPORT\]/g, '')
            .trim();

        const updated = await prisma.rendezVous.update({
            where: { id },
            data: {
                statut: 'ANNULE',
                motif: cleanedMotif || null
            },
            include: { patient: { include: { utilisateur: true } } }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: updated.patient.utilisateurId,
                titre: '❌ Rendez-vous annulé',
                message: 'Votre rendez-vous a été annulé. Veuillez prendre contact avec le service hospitalier.'
            }
        });

        if (current.sousAdminId) {
            await prisma.salleAttente.deleteMany({
                where: { sousAdminId: current.sousAdminId, patientId: current.patientId }
            });
        }

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

        await ensureSalleAttenteForTodaysAppointments(prisma, sousAdmin.id);

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
            status: e.status,
            isUrgent: e.isUrgent,
            presenceStatus: e.presenceStatus
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
            data: { status: 'EN_CONSULTATION', presenceStatus: 'PRESENT' },
            include: { patient: { include: { utilisateur: true } } }
        });

        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

        // No need to update RendezVous.presenceStatus as it's now in SalleAttente
        await prisma.rendezVous.updateMany({
            where: {
                patientId: entry.patientId,
                statut: 'CONFIRME',
                date: { gte: startOfDay, lte: endOfDay }
            },
            data: {
                statut: 'EN_CONSULTATION' as any
            }
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


        await prisma.salleAttente.update({
            where: { id: next.id },
            data: { status: 'EN_CONSULTATION', presenceStatus: 'PRESENT' }
        });


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
        const normalizedSA = normalizeSpecialty(sousAdmin.specialite);
        const normalizedQuery = normalizeSpecialty(specialite as string | undefined);
        const targetSpecialty = normalizedQuery || normalizedSA;
        const filteredDoctors = targetSpecialty
            ? doctors.filter((doc) => normalizeSpecialty(doc.specialite) === targetSpecialty)
            : doctors;

        const formatted = filteredDoctors.map(doc => {
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
                    // Removed date filter here to see all pending stats or handle specifically
                    OR: [
                        { sousAdminId: sousAdmin.id },
                        { sousAdminId: null }
                    ]
                }
            }),
            prisma.salleAttente.count({
                where: {
                    sousAdminId: sousAdmin.id,
                    joinedAt: { gte: startOfDay, lte: endOfDay }
                }
            }),
            prisma.patient.count()
        ]);

        const saSpecNormalized = normalizeSpecialty(sousAdmin.specialite);

        // Filter appointments for this Sous-Admin's department
        const filteredBySpec = appointments.filter(apt => {
            if (apt.sousAdminId === sousAdmin.id) return true;
            if (apt.sousAdminId === null && normalizeSpecialty(apt.specialite) === saSpecNormalized) return true;
            return false;
        });

        // For "today" specific stats
        const todayApts = filteredBySpec.filter(a => {
            const d = new Date(a.date);
            return d >= startOfDay && d <= endOfDay;
        });

        const queueEntries = await prisma.salleAttente.findMany({
            where: {
                sousAdminId: sousAdmin.id,
                joinedAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        return res.json({
            // "Demandes à traiter" should be ALL pending for regulated department
            total: filteredBySpec.filter(a => a.statut === 'EN_ATTENTE').length,
            // "Prévus ce jour"
            todayCount: todayApts.length,
            pending: filteredBySpec.filter(a => a.statut === 'EN_ATTENTE').length,
            confirmed: todayApts.filter(a => a.statut === 'CONFIRME').length,
            present: queueEntries.filter(a => a.presenceStatus === 'PRESENT').length,
            urgent: queueEntries.filter(a => a.isUrgent).length,
            late: queueEntries.filter(a => a.presenceStatus === 'EN_RETARD').length,
            absent: queueEntries.filter(a => a.presenceStatus === 'ABSENT').length,
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
