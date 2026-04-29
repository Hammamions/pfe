import type { PrismaClient } from '@prisma/client';
import { formatAppointmentTime } from './appointmentDisplay';

export const markerRdvPre30 = (id: number) => `[[RDV_PRE30:${id}]]`;
export const markerRdvPre15 = (id: number) => `[[RDV_PRE15:${id}]]`;
export const markerRdvT15 = (id: number) => `[[RDV_T15:${id}]]`;
const PREVISIT_NOTIFIED_TAG = '[PREVISIT:NOTIFIED]';
const PREVISIT_ATTEND_TAG = '[PREVISIT:ATTEND]';
const PREVISIT_RESCHEDULE_TAG = '[PREVISIT:ASK_RESCHEDULE]';

async function isPatientAlreadyPresentForAppointmentDay(
    prisma: PrismaClient,
    patientId: number,
    appointmentAt: Date
): Promise<boolean> {
    const start = new Date(appointmentAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const presentEntry = await prisma.salleAttente.findFirst({
        where: {
            patientId,
            presenceStatus: 'PRESENT' as any,
            joinedAt: { gte: start, lt: end }
        },
        select: { id: true }
    });
    return Boolean(presentEntry);
}

function hasAnyPreVisitTag(motif: string | null | undefined): boolean {
    const raw = motif || '';
    return raw.includes(PREVISIT_NOTIFIED_TAG) || raw.includes(PREVISIT_ATTEND_TAG) || raw.includes(PREVISIT_RESCHEDULE_TAG);
}

export function stripPreVisitTags(motif: string | null | undefined): string {
    return (motif || '')
        .replace(/\[PREVISIT:ATTEND\]/g, '')
        .replace(/\[PREVISIT:ASK_RESCHEDULE\]/g, '')
        .replace(/\[PREVISIT:NOTIFIED\]/g, '')
        .trim();
}

export function upsertPreVisitAttend(motif: string | null | undefined): string {
    const base = stripPreVisitTags(motif);
    return `${base} [PREVISIT:ATTEND]`.trim();
}

export function upsertPreVisitRescheduleAsk(motif: string | null | undefined): string {
    const base = (motif || '').replace(/\[PREVISIT:ASK_RESCHEDULE\]/g, '').trim();
    return `${base} [PREVISIT:ASK_RESCHEDULE]`.trim();
}

function upsertPreVisitNotified(motif: string | null | undefined): string {
    const raw = motif || '';
    if (raw.includes(PREVISIT_NOTIFIED_TAG)) return raw.trim();
    return `${raw} ${PREVISIT_NOTIFIED_TAG}`.trim();
}

export async function maybeNotifySoonAfterConfirm(
    prisma: PrismaClient,
    params: {
        patientUserId: number;
        appointmentId: number;
        appointmentAt: Date;
        lieu?: string | null;
        salle?: string | null;
    }
): Promise<void> {
    const ms = params.appointmentAt.getTime() - Date.now();
    if (ms <= 0 || ms > 30 * 60 * 1000) return;

    const apt = await prisma.rendezVous.findUnique({
        where: { id: params.appointmentId },
        select: { motif: true, patientId: true }
    });
    if (!apt?.patientId) return;
    if (await isPatientAlreadyPresentForAppointmentDay(prisma, apt.patientId, params.appointmentAt)) return;
    if (hasAnyPreVisitTag(apt?.motif)) return;

    const heure = formatAppointmentTime(params.appointmentAt);
    const lieu = params.lieu || 'lieu à confirmer';
    const salle = params.salle || 'salle à confirmer';
    await prisma.notification.create({
        data: {
            utilisateurId: params.patientUserId,
            titre: '❓ Serez-vous présent(e) ?',
            message: `Veuillez confirmer votre présence à ce rendez-vous.`
        }
    });
    await prisma.rendezVous.update({
        where: { id: params.appointmentId },
        data: { motif: upsertPreVisitNotified(apt?.motif || null) }
    });
}


export async function tickPreVisitPresenceAsk(prisma: PrismaClient): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + 120 * 60 * 1000);

    const candidates = await prisma.rendezVous.findMany({
        where: {
            date: { gt: now, lte: horizon },
            statut: 'CONFIRME' as any
        },
        include: {
            patient: { include: { utilisateur: true } }
        }
    });

    for (const apt of candidates) {
        if (await isPatientAlreadyPresentForAppointmentDay(prisma, apt.patientId, apt.date)) continue;
        if (hasAnyPreVisitTag(apt.motif)) continue;

        const heure = formatAppointmentTime(apt.date);
        const lieu = apt.lieu || 'lieu à confirmer';
        const salle = apt.salle || 'salle à confirmer';
        await prisma.notification.create({
            data: {
                utilisateurId: apt.patient.utilisateurId,
                titre: '❓ Serez-vous présent(e) ?',
                message: `Veuillez confirmer votre présence à votre rendez-vous de ${heure}.`
            }
        });
        await prisma.rendezVous.update({
            where: { id: apt.id },
            data: { motif: upsertPreVisitNotified(apt.motif || null) }
        });
    }
}


export async function tickAwaitingConsultationReminders(prisma: PrismaClient): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + 15 * 60 * 1000);

    const candidates = await prisma.rendezVous.findMany({
        where: {
            date: { gt: now, lte: horizon },
            statut: { notIn: ['TERMINE', 'ANNULE', 'EN_ATTENTE', 'REPORTE'] as any },
            patient: {
                salleAttente: {
                    some: {
                        status: 'EN_CONSULTATION',
                        presenceStatus: 'PRESENT'
                    }
                }
            }
        },
        include: {
            patient: { include: { utilisateur: true } }
        }
    });

    for (const apt of candidates) {
        if ((apt.motif || '').includes('[T15_NOTIFIED]')) continue;

        const heure = formatAppointmentTime(apt.date);
        const lieu = apt.lieu || 'lieu à confirmer';
        const salle = apt.salle || 'salle à confirmer';
        await prisma.notification.create({
            data: {
                utilisateurId: apt.patient.utilisateurId,
                titre: '🔔 Rendez-vous imminent',
                message: `Votre créneau commence à ${heure}. Rendez-vous au ${lieu} (${salle}).`
            }
        });
        await prisma.rendezVous.update({
            where: { id: apt.id },
            data: { motif: `${apt.motif || ''} [T15_NOTIFIED]`.trim() }
        });
    }
}
