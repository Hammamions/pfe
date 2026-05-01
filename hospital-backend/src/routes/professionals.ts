import { randomUUID } from 'crypto';
import { Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import QRCode from 'qrcode';
import { anchorHashOnChain } from '../chain/anchor';
import { encryptPdfForStorage, sha256Hex } from '../crypto/secureDocCrypto';
import { prisma } from '../lib/prisma';
import { authenticateProfessional, AuthRequest } from '../middleware/auth';
import {
    formatAppointmentCalendarDateKey,
    formatAppointmentTime,
    utcInstantFromWallClock
} from '../utils/appointmentDisplay';
import { mintDocumentVerifyJwt } from '../utils/documentVerifyJwt';
import { ensureSalleAttenteForTodaysAppointments } from '../utils/salleAttenteSync';
import { normalizeSpecialty, specialtyLabelFr } from '../utils/specialty';

const router = Router();
const secureDir = path.join(process.cwd(), 'uploads', 'secure-documents');
fs.mkdirSync(secureDir, { recursive: true });

/** Ne pas utiliser Boolean() : Boolean('false') === true en JavaScript. */
function parseSendSecureFlag(raw: unknown): boolean {
    if (raw === true || raw === 1) return true;
    if (typeof raw === 'string') {
        const s = raw.trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'yes';
    }
    return false;
}

const ABSENCE_NOTIFICATION_TITLE = 'Absence rendez-vous';

function parseDateQuery(value?: string): Date {
    if (!value) return new Date();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date(value);
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
}

function mergeDateAndTime(dateValue: string, timeValue?: string): Date {
    const dateStr = String(dateValue || '').trim();
    const match = timeValue ? String(timeValue).match(/^(\d{2}):(\d{2})/) : null;
    const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd && match) {
        return utcInstantFromWallClock(dateStr, Number(match[1]), Number(match[2]));
    }
    const base = parseDateQuery(dateValue);
    if (!match) return base;
    const merged = new Date(base);
    merged.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return merged;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function stripAppointmentMotifTags(raw: string | null | undefined): string {
    return (raw || '')
        .replace(/\[SPEC:[^\]]+\]/g, '')
        .replace(/\[ANNULER\]/g, '')
        .replace(/\[REPORT\]/g, '')
        .replace(/\[PRESENT:1\]/g, '')
        .replace(/\[URGENT:(?:0|1)\]/g, '')
        .replace(/\[DOC:1\]/g, '')
        .replace(/\[DOC_NAME:[^\]]+\]/g, '')
        .replace(/\[DOC_URL:[^\]]+\]/g, '')
        .replace(/\[DOC_TRAITE:1\]/g, '')
        .replace(/\[PREVISIT:ATTEND\]/g, '')
        .replace(/\[PREVISIT:ASK_RESCHEDULE\]/g, '')
        .replace(/\[PREVISIT:NOTIFIED\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSpecFromMotif(raw: string | null | undefined): string | null {
    const m = (raw || '').match(/\[SPEC:([^\]]+)\]/);
    return m ? m[1].trim() : null;
}

function extractDocNameAndUrlFromMotif(raw: string | null | undefined): { name: string; url: string | null } | null {
    const r = raw || '';
    if (!/\[DOC:1\]/.test(r)) return null;
    const nameMatch = r.match(/\[DOC_NAME:([^\]]+)\]/);
    const name = nameMatch ? nameMatch[1] : 'Pièce jointe';
    let url: string | null = null;
    const urlMatch = r.match(/\[DOC_URL:([^\]]+)\]/);
    if (urlMatch) {
        try {
            url = decodeURIComponent(urlMatch[1]);
        } catch {
            url = null;
        }
    }
    return { name, url };
}

function wrapParagraphForPdf(
    font: PDFFont,
    paragraph: string,
    fontSize: number,
    maxWidth: number
): string[] {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines: string[] = [];
    let current = words[0]!;
    for (let i = 1; i < words.length; i++) {
        const w = words[i]!;
        const trial = `${current} ${w}`;
        if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) current = trial;
        else {
            lines.push(current);
            current = w;
        }
    }
    lines.push(current);
    return lines;
}

/**
 * PDF compte rendu avec QR = empreinte SHA-256 du fichier PDF final (auto-cohérent par itération).
 */
async function buildConsultationSecurePdf(summary: string): Promise<Buffer> {
    const text = String(summary || '').trim();
    const maxTextWidth = 495;
    const fontSize = 11;
    const lineHeight = 14;
    const bottomReserve = 280;

    const renderOnce = async (qrHexPayload: string): Promise<Buffer> => {
        const doc = await PDFDocument.create();
        const page = doc.addPage([595, 842]);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const hex = qrHexPayload.toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '');
        const qrData = /^[a-f0-9]{64}$/.test(hex) ? hex : sha256Hex(Buffer.from(text, 'utf8'));

        page.drawText('Compte rendu de consultation', { x: 50, y: 805, size: 14, font });

        const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
        const lines: string[] = [];
        for (const p of paragraphs) {
            const chunk = wrapParagraphForPdf(font, p, fontSize, maxTextWidth);
            lines.push(...chunk);
        }
        let y = 780;
        for (const line of lines) {
            if (y < bottomReserve) break;
            page.drawText(line || ' ', { x: 50, y, size: fontSize, font });
            y -= lineHeight;
        }

        const margin = 48;
        const qrSize = 140;
        const qrX = 595 - margin - qrSize;
        const qrY = 52;
        page.drawText('Empreinte SHA-256 du fichier PDF (scannable) :', {
            x: qrX,
            y: qrY + qrSize + 22,
            size: 9,
            font,
            maxWidth: qrSize + 30
        });
        const png = await QRCode.toBuffer(qrData, {
            type: 'png',
            width: 160,
            margin: 1,
            errorCorrectionLevel: 'M'
        });
        const qrImage = await doc.embedPng(png);
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
        page.drawText(qrData.slice(0, 32), { x: qrX, y: qrY - 6, size: 6, font });
        page.drawText(qrData.slice(32), { x: qrX, y: qrY - 14, size: 6, font });

        return Buffer.from(await doc.save());
    };

    let h = sha256Hex(Buffer.from(text, 'utf8'));
    let buf = await renderOnce(h);
    for (let i = 0; i < 48; i++) {
        const next = sha256Hex(buf);
        if (next === h) return buf;
        h = next;
        buf = await renderOnce(h);
    }
    console.warn(
        '[buildConsultationSecurePdf] QR SHA-256 fixpoint non atteint après 48 itérations ; dernier PDF utilisé.'
    );
    return buf;
}

function isConsultationReportHistoryBlob(entry: unknown): boolean {
    if (typeof entry !== 'string') return false;
    const raw = entry.trim();
    if (!raw.startsWith('{') || !raw.endsWith('}')) return false;
    try {
        const o = JSON.parse(raw);
        return o?.kind === 'consultation_report';
    } catch {
        return false;
    }
}

/** Entrées « antécédents » affichables : exclut les blobs JSON compte-rendu (déjà listés en consultations). */
function filterHistoriqueForAntecedentsDisplay(entries: string[] | null | undefined): string[] {
    return (Array.isArray(entries) ? entries : []).filter((e) => !isConsultationReportHistoryBlob(e));
}

function parseConsultationHistoryEntries(entries: string[] | null | undefined, doctorLabel: string) {
    const rows = Array.isArray(entries) ? entries : [];
    return rows
        .map((entry, idx) => {
            try {
                const parsed = JSON.parse(String(entry));
                if (parsed?.kind !== 'consultation_report') return null;
                const date = parsed.createdAt || new Date().toISOString();
                const text = String(parsed.summary || '').trim();
                const symptomTokens = text
                    .split('\n')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .slice(0, 3);
                return {
                    id: `cr-${parsed.id || idx}`,
                    date,
                    medecin: parsed.medecin || doctorLabel,
                    motif: parsed.title || 'Compte rendu de consultation',
                    symptomes: symptomTokens.length > 0 ? symptomTokens : ['Compte rendu enregistré'],
                    diagnostic: text.slice(0, 180) || 'Compte rendu enregistré',
                    traitement: parsed.sentSecure ? 'Document sécurisé envoyé au patient' : 'Compte rendu archivé',
                    notes: text
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

async function buildDemandeDetailsForSecretariat(
    patientId: number,
    todaysApt: { id: number; date: Date; motif: string | null; lieu: string | null; salle: string | null; statut: string }
): Promise<string> {
    const cleanToday = stripAppointmentMotifTags(todaysApt.motif);
    const specToday = extractSpecFromMotif(todaysApt.motif);
    const specTodayFr = specialtyLabelFr(specToday || '');

    const parts: string[] = [];
    parts.push('━━ Contexte du rendez-vous concerné ━━');
    parts.push(
        `Date : ${formatAppointmentCalendarDateKey(todaysApt.date)} à ${formatAppointmentTime(todaysApt.date)}`
    );
    if (specToday) parts.push(`Spécialité : ${specTodayFr}`);
    parts.push(`Motif / raison : ${cleanToday || '—'}`);
    parts.push(`Lieu : ${todaysApt.lieu || '—'} · Salle : ${todaysApt.salle || '—'}`);
    parts.push(`Statut : ${todaysApt.statut}`);

    const todayDoc = extractDocNameAndUrlFromMotif(todaysApt.motif);
    if (todayDoc) {
        parts.push(
            todayDoc.url
                ? `Pièce jointe : ${todayDoc.name} (${todayDoc.url})`
                : `Pièce jointe signalée : ${todayDoc.name} (fichier non disponible sur le serveur)`
        );
    }

    const recentRdvs = await prisma.rendezVous.findMany({
        where: { patientId },
        orderBy: { date: 'desc' },
        take: 8
    });
    const others = recentRdvs.filter((r) => r.id !== todaysApt.id).slice(0, 4);

    if (others.length > 0) {
        parts.push('');
        parts.push('━━ Historique récent (lecture seule, max. 4) ━━');
        for (const r of others) {
            const clean = stripAppointmentMotifTags(r.motif);
            const spec = extractSpecFromMotif(r.motif);
            const specFr = specialtyLabelFr(spec || '');
            const pj = extractDocNameAndUrlFromMotif(r.motif);
            const snippet = clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
            let line = `• ${formatAppointmentCalendarDateKey(r.date)} ${formatAppointmentTime(r.date)} — ${String(r.statut)} — ${specFr}`;
            if (snippet) line += ` — ${snippet}`;
            if (pj) line += pj.url ? ` · 📎 ${pj.name}` : ` · 📎 ${pj.name}`;
            parts.push(line);
        }
    }

    return parts.join('\n');
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
                    message: `Absence constatée pour le rendez-vous. Le délai de 30 minutes est dépassé, le rendez-vous est clos automatiquement.`
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
        let filteredDoctors = targetSpecialty
            ? doctors.filter((doc) => normalizeSpecialty(doc.specialite) === targetSpecialty)
            : doctors;
        if (filteredDoctors.length === 0 && doctors.length > 0 && isSousAdmin) {
            filteredDoctors = doctors;
        }

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
                statut: status,
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

router.get('/doctor-dashboard-metrics', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const activeSince = new Date(now);
        activeSince.setDate(activeSince.getDate() - 90);

        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const [
            activePatientsGroups,
            consultationsThisMonth,
            consultationsPrevMonth,
            ordonnancesThisMonth,
            pendingTomorrow,
            pendingFuture
        ] = await Promise.all([
            prisma.rendezVous.groupBy({
                by: ['patientId'],
                where: {
                    medecinId: medecin.id,
                    statut: { notIn: ['ANNULE'] },
                    date: { gte: activeSince }
                }
            }),
            prisma.rendezVous.count({
                where: {
                    medecinId: medecin.id,
                    statut: 'TERMINE',
                    date: { gte: startOfMonth, lte: endOfMonth }
                }
            }),
            prisma.rendezVous.count({
                where: {
                    medecinId: medecin.id,
                    statut: 'TERMINE',
                    date: { gte: startPrevMonth, lte: endPrevMonth }
                }
            }),
            prisma.ordonnance.count({
                where: {
                    medecinId: medecin.id,
                    createdAt: { gte: startOfMonth, lte: endOfMonth }
                }
            }),
            prisma.rendezVous.count({
                where: {
                    medecinId: medecin.id,
                    statut: 'EN_ATTENTE',
                    date: { gte: tomorrowStart, lte: tomorrowEnd }
                }
            }),
            prisma.rendezVous.count({
                where: {
                    medecinId: medecin.id,
                    statut: 'EN_ATTENTE',
                    date: { gt: tomorrowEnd }
                }
            })
        ]);

        const newPatientsRows = await prisma.$queryRaw<[{ c: bigint }]>`
            SELECT COUNT(*)::bigint AS c FROM (
                SELECT "patientId"
                FROM "RendezVous"
                WHERE "medecinId" = ${medecin.id}
                GROUP BY "patientId"
                HAVING MIN(date) >= ${startOfMonth} AND MIN(date) <= ${endOfMonth}
            ) sub
        `;
        const newPatientsThisMonth = Number(newPatientsRows[0]?.c ?? 0);

        const DEFAULT_SLOT_MIN = 30;
        const averageMinutes = consultationsThisMonth > 0 ? DEFAULT_SLOT_MIN : null;

        return res.json({
            activePatients: activePatientsGroups.length,
            consultationsThisMonth,
            consultationsTrendUp: consultationsThisMonth > consultationsPrevMonth,
            stats: {
                consultations: consultationsThisMonth,
                ordonnances: ordonnancesThisMonth,
                newPatients: newPatientsThisMonth,
                averageMinutes
            },
            alerts: {
                pendingConfirmationTomorrow: pendingTomorrow,
                pendingConfirmationLater: pendingFuture
            }
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
                .replace(/\[DOC_URL:[^\]]+\]/g, '')
                .replace(/\[DOC_TRAITE:1\]/g, '')
                .trim();
            const hasDocuments = /\[DOC:1\]/.test(rawMotif);
            const documentsProcessed = /\[DOC_TRAITE:1\]/.test(rawMotif);
            const documentNameMatch = rawMotif.match(/\[DOC_NAME:([^\]]+)\]/);
            const isUrgentFromRdv = /\[URGENT:1\]/.test(rawMotif);
            const hasPresentTag = /\[PRESENT:1\]/.test(rawMotif);
            const hasAttendTag = /\[PREVISIT:ATTEND\]/.test(rawMotif);
            const waitingPresence = apt.patient.salleAttente?.[0]?.presenceStatus;
            const computedPresenceStatus =
                apt.statut === 'EN_COURS' || hasPresentTag || waitingPresence === 'PRESENT'
                    ? 'PRESENT'
                    : hasAttendTag
                        ? 'CONFIRME'
                        : (waitingPresence === 'ABSENT' || waitingPresence === 'EN_RETARD')
                            ? waitingPresence
                            : 'PREVU';

            return {
                id: apt.id,
                patientId: apt.patientId,
                date: formatAppointmentCalendarDateKey(apt.date),
                time: formatAppointmentTime(apt.date),
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
                medecinId: apt.medecinId,
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

        const now = new Date();
        const todayKey = formatAppointmentCalendarDateKey(now);
        const looseStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const looseEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const appointmentsRaw = await prisma.rendezVous.findMany({
            where: {
                medecinId: medecin.id,
                statut: { in: ['CONFIRME', 'EN_COURS'] as any },
                date: { gte: looseStart, lte: looseEnd }
            },
            include: {
                patient: {
                    include: {
                        utilisateur: true,
                        dossierMedical: {
                            include: {
                                documents: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 80,
                                    select: {
                                        id: true,
                                        titre: true,
                                        urlFichier: true,
                                        type: true,
                                        praticien: true,
                                        createdAt: true,
                                        publicId: true,
                                        medecinId: true,
                                        dossierMedicalId: true
                                    }
                                }
                            }
                        },
                        salleAttente: {
                            where: {
                                joinedAt: { gte: looseStart, lte: looseEnd }
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        const appointments = appointmentsRaw.filter(
            (apt) => formatAppointmentCalendarDateKey(apt.date) === todayKey
        );

        const waiting = appointments.filter((apt: any) => {
            const inProgress = (apt.statut as any) === 'EN_COURS';
            const hasPresentTag = /\[PRESENT:1\]/.test(apt.motif || '');
            const hasPresentInQueue = (apt.patient?.salleAttente || []).some((sa: { presenceStatus: string; joinedAt: Date }) => {
                if (sa.presenceStatus !== 'PRESENT') return false;
                return formatAppointmentCalendarDateKey(new Date(sa.joinedAt)) === todayKey;
            });
            return inProgress || hasPresentTag || hasPresentInQueue;
        });

        const patientIds = [...new Set(waiting.map((w: any) => w.patientId))];
        const rdvAttachmentsByPatient = new Map<
            number,
            Array<{
                id: string;
                titre: string;
                type: string;
                urlFichier: string | null;
                appointmentId: number;
                rdvDate: Date;
                source: string;
            }>
        >();
        if (patientIds.length > 0) {
            const rdvsWithDocFlag = await prisma.rendezVous.findMany({
                where: {
                    patientId: { in: patientIds },
                    motif: { contains: '[DOC:1]' }
                },
                orderBy: { date: 'desc' }
            });
            for (const rdv of rdvsWithDocFlag) {
                const raw = rdv.motif || '';
                if (!/\[DOC:1\]/.test(raw)) continue;
                const nameMatch = raw.match(/\[DOC_NAME:([^\]]+)\]/);
                const fileName = nameMatch ? nameMatch[1] : 'Pièce jointe';
                let fileUrl: string | null = null;
                const urlMatch = raw.match(/\[DOC_URL:([^\]]+)\]/);
                if (urlMatch) {
                    try {
                        fileUrl = decodeURIComponent(urlMatch[1]);
                    } catch {
                        fileUrl = null;
                    }
                }
                if (!fileUrl || !String(fileUrl).trim()) {
                    continue;
                }
                const row = {
                    id: `rdv-attachment-${rdv.id}`,
                    titre: fileName,
                    type: 'Pièce jointe (demande de RDV)',
                    urlFichier: fileUrl,
                    appointmentId: rdv.id,
                    rdvDate: rdv.date,
                    source: 'appointment_request'
                };
                const list = rdvAttachmentsByPatient.get(rdv.patientId) || [];
                list.push(row);
                rdvAttachmentsByPatient.set(rdv.patientId, list);
            }
        }

        return res.json(waiting.map((apt: any) => {
            const rawHistorique = apt.patient.dossierMedical?.historiqueMedical || [];
            const antecedentsDisplay = filterHistoriqueForAntecedentsDisplay(rawHistorique);
            return ({
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
                motif: stripAppointmentMotifTags(apt.motif) || 'Consultation',
                heure: formatAppointmentTime(apt.date),
                lieu: apt.lieu || 'À définir',
                salle: apt.salle || 'À définir',
                dossierMedical: {
                    bloodGroup: apt.patient.dossierMedical?.groupeSanguin || 'Non précisé',
                    allergies: apt.patient.dossierMedical?.allergies || [],
                    history: antecedentsDisplay,
                    socialSecurity: apt.patient.dossierMedical?.numSecuriteSociale || ''
                },
                allergies: apt.patient.dossierMedical?.allergies || [],
                antecedents: antecedentsDisplay,
                consultations: parseConsultationHistoryEntries(
                    rawHistorique,
                    `Dr. ${apt.medecin?.utilisateur?.prenom || ''} ${apt.medecin?.utilisateur?.nom || ''}`.trim()
                ),
                documents: [
                    ...(apt.patient.dossierMedical?.documents || []),
                    ...(rdvAttachmentsByPatient.get(apt.patientId) || [])
                ]
            });
        }
        ));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/request-new-consultation', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const patientId = parseInt(String(req.body?.patientId ?? ''), 10);
        if (Number.isNaN(patientId)) {
            return res.status(400).json({ error: 'patientId requis' });
        }

        const medecin = await prisma.medecin.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const now = new Date();
        const todayKey = formatAppointmentCalendarDateKey(now);
        const looseStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const looseEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const todaysApt = await prisma.rendezVous.findFirst({
            where: {
                patientId,
                medecinId: medecin.id,
                statut: { in: ['CONFIRME', 'EN_COURS'] as any },
                date: { gte: looseStart, lte: looseEnd }
            },
            orderBy: { date: 'asc' }
        });

        if (!todaysApt || formatAppointmentCalendarDateKey(todaysApt.date) !== todayKey) {
            return res.status(403).json({
                error: "Ce patient ne figure pas dans votre salle d'attente du jour."
            });
        }

        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

        const drName = `Dr. ${medecin.utilisateur.prenom} ${medecin.utilisateur.nom}`;
        const patientName = `${patient.utilisateur.prenom} ${patient.utilisateur.nom}`;
        const demandeDetails = await buildDemandeDetailsForSecretariat(patientId, {
            id: todaysApt.id,
            date: todaysApt.date,
            motif: todaysApt.motif,
            lieu: todaysApt.lieu,
            salle: todaysApt.salle,
            statut: String(todaysApt.statut ?? '')
        });
        const saMessage = `${drName} demande une nouvelle consultation pour ${patientName}.\nMerci de proposer un créneau et d'avertir le patient.\n\n${demandeDetails}\n\n[PATIENT_ID:${patientId}]`;

        const allSousAdmins = await prisma.sousAdmin.findMany({
            select: { utilisateurId: true }
        });
        if (allSousAdmins.length > 0) {
            await prisma.notification.createMany({
                data: allSousAdmins.map((sa) => ({
                    utilisateurId: sa.utilisateurId,
                    titre: '📋 Demande de nouvelle consultation',
                    message: saMessage
                }))
            });
        }

        await prisma.notification.create({
            data: {
                utilisateurId: patient.utilisateurId,
                titre: ' Demande de consultation',
                message: `${drName} a transmis une demande au secrétariat pour une nouvelle consultation. Vous serez informé(e) dès qu'un rendez-vous sera planifié.`
            }
        });

        return res.json({ ok: true });
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

        const dateParam = (req.query.date as string | undefined)?.trim();
        const targetDayKey =
            dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
                ? dateParam
                : formatAppointmentCalendarDateKey(new Date());

        let looseStart: Date;
        let looseEnd: Date;
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            const [y, m, d] = dateParam.split('-').map(Number);
            looseStart = new Date(Date.UTC(y, m - 1, d - 2, 0, 0, 0, 0));
            looseEnd = new Date(Date.UTC(y, m - 1, d + 2, 23, 59, 59, 999));
        } else {
            const t = Date.now();
            looseStart = new Date(t - 14 * 24 * 60 * 60 * 1000);
            looseEnd = new Date(t + 14 * 24 * 60 * 60 * 1000);
        }

        const appointmentsRaw = await prisma.rendezVous.findMany({
            where: {
                medecinId: medecin.id,
                date: { gte: looseStart, lte: looseEnd },
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

        const appointments = appointmentsRaw.filter(
            (apt) => formatAppointmentCalendarDateKey(apt.date) === targetDayKey
        );

        return res.json(appointments.map((apt: any) => {
            const rawMotif = apt.motif || '';
            return {
                id: apt.id,
                date: formatAppointmentCalendarDateKey(apt.date),
                heure: formatAppointmentTime(apt.date),
                duree: 30,
                statut: String(apt.statut || '')
                    .toLowerCase()
                    .replace(/_/g, ' '),
                rescheduleStatus: (apt.statut as any) === 'REPORTE' || /\[REPORT\]/.test(rawMotif) ? 'pending' : null,
                salle: apt.salle || 'À définir',
                motif: stripAppointmentMotifTags(rawMotif) || 'Consultation',
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
                    titre: ' Demande de report médecin',
                    message: `Le Dr a demandé le report du rendez-vous de ${appointment.patient.utilisateur.prenom} ${appointment.patient.utilisateur.nom}.`
                }
            });
        }

        return res.json({ message: 'Demande de reprogrammation envoyée', appointment: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/prescription-patients', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const rdvs = await prisma.rendezVous.findMany({
            where: { medecinId: medecin.id },
            include: {
                patient: {
                    include: {
                        utilisateur: true,
                        dossierMedical: true
                    }
                }
            },
            orderBy: { date: 'desc' },
            take: 500
        });

        const byPatient = new Map<number, {
            id: string;
            patientId: number;
            patient: {
                prenom: string;
                nom: string;
                email: string;
                telephone: string;
                dateNaissance: string;
                numeroSecu: string;
            };
            allergies: string[];
        }>();

        for (const apt of rdvs) {
            const pid = apt.patientId;
            if (byPatient.has(pid)) continue;
            const u = apt.patient.utilisateur;
            const dm = apt.patient.dossierMedical;
            byPatient.set(pid, {
                id: String(pid),
                patientId: pid,
                patient: {
                    prenom: u.prenom,
                    nom: u.nom,
                    email: u.email || '',
                    telephone: apt.patient.telephone || '',
                    dateNaissance: dm?.dateNaissance || '',
                    numeroSecu: dm?.numSecuriteSociale || ''
                },
                allergies: dm?.allergies || []
            });
        }

        return res.json(Array.from(byPatient.values()));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/prescriptions', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }

        const medecin = await prisma.medecin.findUnique({ where: { utilisateurId: req.userId } });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const { patientId, contenu: rawContenu, urlPdf } = req.body || {};
        let contenu: string;
        if (rawContenu !== undefined && rawContenu !== null && typeof rawContenu === 'object') {
            contenu = JSON.stringify(rawContenu);
        } else {
            contenu = rawContenu === undefined || rawContenu === null ? '' : String(rawContenu);
        }
        const pid = Number(patientId);
        if (!Number.isFinite(pid) || contenu.trim() === '') {
            return res.status(400).json({ error: 'patientId et contenu requis' });
        }

        const patient = await prisma.patient.findUnique({
            where: { id: pid },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const ordonnance = await prisma.ordonnance.create({
            data: {
                patientId: pid,
                medecinId: medecin.id,
                contenu: contenu.trim(),
                urlPdf: urlPdf && typeof urlPdf === 'string' && urlPdf.trim() ? urlPdf.trim() : null
            },
            include: {
                medecin: { include: { utilisateur: true } },
                patient: { include: { utilisateur: true } }
            }
        });

        await prisma.notification.create({
            data: {
                utilisateurId: patient.utilisateurId,
                titre: 'Nouvelle ordonnance',
                message: `Une nouvelle ordonnance a été ajoutée à votre dossier par le Dr. ${ordonnance.medecin.utilisateur.prenom} ${ordonnance.medecin.utilisateur.nom}.`
            }
        });

        return res.status(201).json(ordonnance);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/consultation-reports', authenticateProfessional, async (req: AuthRequest, res: Response) => {
    try {
        if (req.role !== 'DOCTOR' && req.role !== 'MEDECIN') {
            return res.status(403).json({ error: 'Accès réservé aux médecins' });
        }
        const medecin = await prisma.medecin.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!medecin) return res.status(404).json({ error: 'Médecin non trouvé' });

        const patientId = Number(req.body?.patientId);
        const summary = String(req.body?.summary || '').trim();
        const sendSecure = parseSendSecureFlag(req.body?.sendSecure);
        const notifyPatient = req.body?.notifyPatient !== false; // Active par défaut pour "Envoyer", explicite false pour "Sauvegarder"

        if (!Number.isFinite(patientId) || patientId <= 0 || !summary) {
            return res.status(400).json({ error: 'patientId et summary requis' });
        }

        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

        const dossier = await prisma.dossierMedical.upsert({
            where: { patientId: patient.id },
            create: {
                patientId: patient.id,
                // Required list fields in Prisma schema must be initialized.
                allergies: [],
                historiqueMedical: []
            },
            update: {}
        });

        const historyItem = JSON.stringify({
            kind: 'consultation_report',
            id: randomUUID(),
            title: 'Compte rendu de consultation',
            summary,
            medecin: `Dr. ${medecin.utilisateur.prenom} ${medecin.utilisateur.nom}`,
            sentSecure: sendSecure,
            createdAt: new Date().toISOString()
        });

        const doctorLabel = `Dr. ${medecin.utilisateur.prenom} ${medecin.utilisateur.nom}`;
        const notificationData = notifyPatient ? {
            utilisateurId: patient.utilisateurId,
            titre: sendSecure ? 'Nouveau document — compte rendu' : 'Mise à jour du dossier',
            message: sendSecure
                ? `${doctorLabel} vous a envoyé un compte rendu sécurisé. Ouvrez la section Documents pour le consulter ou le télécharger.`
                : `${doctorLabel} a enregistré un compte rendu de consultation dans votre dossier. Consultez Documents ou votre espace patient pour les détails.`
        } : null;

        let secureDoc: { id: number; publicId: string | null } | null = null;
        let writtenSecureAbsPath: string | null = null;
        let blockchainAnchoredForResponse = false;

        if (sendSecure) {
            const pdfBuffer = await buildConsultationSecurePdf(summary);
            const publicId = randomUUID();
            const hash = sha256Hex(pdfBuffer);
            const { cipher, iv, authTag } = encryptPdfForStorage(pdfBuffer);
            const relPath = path.join('uploads', 'secure-documents', `${publicId}.bin`);
            const absPath = path.join(process.cwd(), relPath);
            fs.writeFileSync(absPath, cipher);
            writtenSecureAbsPath = absPath;

            let anchorTxHash: string | null = null;
            let anchorChainId: number | null = null;
            let anchorContractAddress: string | null = null;
            let anchorBlockNumber: bigint | null = null;
            let anchoredAt: Date | null = null;
            try {
                const anchorResult = await anchorHashOnChain(hash);
                if (anchorResult) {
                    anchorTxHash = anchorResult.txHash;
                    anchorChainId = anchorResult.chainId;
                    anchorContractAddress = anchorResult.contractAddress;
                    anchorBlockNumber = anchorResult.blockNumber;
                    anchoredAt = new Date();
                    blockchainAnchoredForResponse = true;
                }
            } catch (anchorErr) {
                console.error('[consultation-reports] ancrage blockchain ignoré (erreur):', anchorErr);
            }

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.dossierMedical.update({
                        where: { id: dossier.id },
                        data: { historiqueMedical: { push: historyItem } }
                    });
                    const created = await tx.document.create({
                        data: {
                            titre: 'Compte rendu de consultation',
                            urlFichier: `/api/secure-documents/download/${publicId}`,
                            type: 'secure_medical',
                            praticien: doctorLabel,
                            dossierMedicalId: dossier.id,
                            medecinId: medecin.id,
                            publicId,
                            contentSha256: hash,
                            securePreviewSummary: summary,
                            cipherStoragePath: relPath,
                            aesIvBase64: iv.toString('base64'),
                            aesAuthTagBase64: authTag.toString('base64'),
                            anchorTxHash,
                            anchorChainId: anchorChainId ?? undefined,
                            anchorContractAddress: anchorContractAddress ?? undefined,
                            anchorBlockNumber: anchorBlockNumber ?? undefined,
                            anchoredAt
                        }
                    });
                    secureDoc = { id: created.id, publicId: created.publicId };
                    if (notificationData) {
                        await tx.notification.create({ data: notificationData });
                    }
                });
            } catch (txErr) {
                if (writtenSecureAbsPath) {
                    try {
                        fs.unlinkSync(writtenSecureAbsPath);
                    } catch {
                    }
                }
                throw txErr;
            }
        } else {
            await prisma.$transaction(async (tx) => {
                await tx.dossierMedical.update({
                    where: { id: dossier.id },
                    data: { historiqueMedical: { push: historyItem } }
                });
                if (notificationData) {
                    await tx.notification.create({ data: notificationData });
                }
            });
        }

        let verifyToken: string | undefined;
        let verifyPath: string | undefined;
        if (sendSecure && secureDoc?.publicId) {
            verifyToken = mintDocumentVerifyJwt(secureDoc.publicId);
            verifyPath = `/api/verify/document?t=${encodeURIComponent(verifyToken)}`;
        }

        return res.status(201).json({
            message: sendSecure
                ? (notifyPatient ? 'Compte rendu sauvegardé et envoyé au patient' : 'Compte rendu sauvegardé (non notifié)')
                : 'Compte rendu sauvegardé dans le dossier (JSON)',
            secureDocument: secureDoc,
            patientNotified: !!notificationData,
            documentSecurity: sendSecure
                ? {
                    kind: 'encrypted_consultation',
                    description:
                        'PDF chiffré au stockage ; déchiffrement réservé au patient. Pas de signature numérique médecin sur ce flux.',
                    blockchainAnchored: blockchainAnchoredForResponse
                }
                : undefined,
            verifyToken,
            verifyPath
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;