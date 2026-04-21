import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import { normalizeSpecialty } from '../utils/specialty';
import { formatAppointmentCalendarDateKey, formatAppointmentTime } from '../utils/appointmentDisplay';
import { sendAccountCredentialsEmail } from '../utils/mail';

const router = Router();

const parseDayParam = (value: unknown): Date => {
    if (typeof value !== 'string') return new Date();
    const v = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date();
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const toStartEndOfDay = (d: Date) => {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const normalizeNoAccent = (v: string) =>
    v
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const toDoctorStatus = (raw: string | undefined | null): 'actif' | 'inactif' | 'congé' => {
    const s = normalizeNoAccent(String(raw ?? 'actif'));
    if (s === 'inactif') return 'inactif';
    if (s === 'conge' || s === 'cong e') return 'congé';
    if (s === 'conge') return 'congé';
    return 'actif';
};

const doctorAvatarColors = [
    'bg-purple-100 text-purple-700',
    'bg-blue-100 text-blue-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700'
];

const computeInitials = (fullName: string): string => {
    const cleaned = fullName
        .replace(/^dr\.?\s+/i, '')
        .trim()
        .replace(/\s+/g, ' ');
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'DR';
};

const computeAvatarColor = (specialty: string): string => {
    const s = String(specialty ?? '').toLowerCase();
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return doctorAvatarColors[h % doctorAvatarColors.length];
};

const stripTitleDr = (name: string): string => name.replace(/^dr\.?\s+/i, '').trim();

const buildNameParts = (fullName: string): { prenom: string; nom: string } => {
    const cleaned = stripTitleDr(fullName).replace(/\s+/g, ' ').trim();
    const parts = cleaned.split(' ').filter(Boolean);
    const prenom = parts[0] || 'Dr';
    const nom = parts.slice(1).join(' ') || '';
    return { prenom, nom: nom || prenom };
};

const isInactifConge = (conge: { reason: string | null; endDate: Date }, refDate: Date) => {
    const r = normalizeNoAccent(String(conge.reason ?? ''));
    if (r.includes('inactif')) return true;
    const diffDays = (conge.endDate.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000);
    return diffDays >= 365 * 5;
};

const mapDoctorStatusFromConges = (conges: Array<{ startDate: Date; endDate: Date; reason: string | null }>, refDate: Date) => {
    const covering = conges.filter((c) => c.startDate <= refDate && c.endDate >= refDate);
    if (covering.length === 0) return 'actif' as const;
    const inactif = covering.some((c) => isInactifConge(c as any, refDate));
    return inactif ? ('inactif' as const) : ('congé' as const);
};

const stripAppointmentMotifTags = (raw: string | null | undefined): string => {
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
};

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCpuSnapshot = () =>
    os.cpus().map((cpu) => ({
        idle: cpu.times.idle,
        total: Object.values(cpu.times).reduce((acc, t) => acc + t, 0)
    }));

const getCpuUsagePercent = async () => {
    const start = getCpuSnapshot();
    await sleep(150);
    const end = getCpuSnapshot();

    let totalIdleDiff = 0;
    let totalDiff = 0;
    for (let i = 0; i < end.length; i += 1) {
        totalIdleDiff += end[i].idle - start[i].idle;
        totalDiff += end[i].total - start[i].total;
    }

    if (totalDiff <= 0) return 0;
    const usage = (1 - totalIdleDiff / totalDiff) * 100;
    return Math.max(0, Math.min(100, Math.round(usage)));
};

const getDiskUsageGb = () => {
    try {
        const stats = fs.statfsSync(process.cwd());
        const totalBytes = stats.blocks * stats.bsize;
        const freeBytes = stats.bavail * stats.bsize;
        const usedBytes = totalBytes - freeBytes;
        return {
            used: Math.max(0, Math.round(usedBytes / 1024 / 1024 / 1024)),
            total: Math.max(1, Math.round(totalBytes / 1024 / 1024 / 1024))
        };
    } catch {
        return {
            used: 0,
            total: 1
        };
    }
};

const formatTimeAgo = (d: Date) => {
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
};

router.get('/overview', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const { start, end } = toStartEndOfDay(now);
        const [patientsCount, doctorsCount, subAdminsCount, appointmentsTodayCount, appointmentsPendingCount] = await Promise.all([
            prisma.patient.count(),
            prisma.medecin.count(),
            prisma.sousAdmin.count(),
            prisma.rendezVous.count({ where: { date: { gte: start, lte: end } } }),
            prisma.rendezVous.count({
                where: {
                    date: { gte: start, lte: end },
                    statut: 'EN_ATTENTE' as any
                }
            })
        ]);

        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notificationsLast24hCount = await prisma.notification.count({
            where: { createdAt: { gte: since24h } }
        });

        return res.json({
            patientsCount,
            doctorsCount,
            subAdminsCount,
            appointmentsTodayCount,
            appointmentsPendingCount,
            notificationsLast24hCount
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/monthly-stats', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

        const [consultations, ordonnances, uploadedDocuments, feedbackAggregate] = await Promise.all([
            prisma.rendezVous.count({
                where: {
                    statut: 'TERMINE' as any,
                    date: { gte: monthStart, lt: nextMonthStart }
                }
            }),
            prisma.ordonnance.count({
                where: {
                    createdAt: { gte: monthStart, lt: nextMonthStart }
                }
            }),
            prisma.document.count({
                where: {
                    createdAt: { gte: monthStart, lt: nextMonthStart },
                    praticien: { contains: 'Sous-admin', mode: 'insensitive' }
                }
            }),
            prisma.feedback.aggregate({
                _avg: { note: true },
                where: {
                    createdAt: { gte: monthStart, lt: nextMonthStart }
                }
            })
        ]);

        const satisfactionRate = Math.max(
            0,
            Math.min(100, Math.round(((feedbackAggregate._avg.note ?? 0) / 5) * 100))
        );

        return res.json({
            consultations,
            ordonnances,
            uploadedDocuments,
            satisfactionRate
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/system-surveillance', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    const responseStart = Date.now();
    try {
        const [cpu, dbProbe, authProbe, unreadNotifications] = await Promise.all([
            getCpuUsagePercent(),
            prisma.$queryRaw`SELECT 1`,
            prisma.utilisateur.count(),
            prisma.notification.count({ where: { lue: false } })
        ]);

        const totalMemGb = os.totalmem() / 1024 / 1024 / 1024;
        const usedMemGb = (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024;
        const memory = {
            used: roundToOneDecimal(usedMemGb),
            total: roundToOneDecimal(totalMemGb)
        };

        const disk = getDiskUsageGb();
        const uptime = roundToOneDecimal((process.uptime() / (24 * 60 * 60)) >= 1 ? 99.9 : 99.5);
        const requestsPerMin = Number(req.app.locals.requestCounterLastMinute || 0);
        const responseTime = Date.now() - responseStart;

        const serviceStatus = {
            database: dbProbe ? 'operational' : 'down',
            api: 'operational',
            auth: authProbe >= 0 ? 'operational' : 'down',
            notifications: unreadNotifications > 200 ? 'degraded' : 'operational'
        };

        return res.json({
            cpu,
            memory,
            disk,
            responseTime,
            requestsPerMin,
            errors: 0,
            uptime,
            services: serviceStatus
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/system-alerts', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const [cpu, pendingAppointmentsCount, pendingDoctorActions, unreadNotifications] = await Promise.all([
            getCpuUsagePercent(),
            prisma.rendezVous.count({
                where: { statut: 'EN_ATTENTE' as any }
            }),
            prisma.notification.count({
                where: {
                    lue: false,
                    message: { contains: 'médecin', mode: 'insensitive' }
                }
            }),
            prisma.notification.count({ where: { lue: false } })
        ]);

        const disk = getDiskUsageGb();
        const diskUsagePct = Math.round((disk.used / disk.total) * 100);
        const requestsPerMin = Number(req.app.locals.requestCounterLastMinute || 0);
        const now = new Date();

        const alerts: Array<{
            id: string;
            severity: 'high' | 'medium' | 'low';
            message: string;
            time: string;
            acknowledged: boolean;
        }> = [];

        if (diskUsagePct >= 85) {
            alerts.push({
                id: 'disk-critical',
                severity: diskUsagePct >= 92 ? 'high' : 'medium',
                message: `Espace disque élevé (${diskUsagePct}% utilisé sur serveur)`,
                time: formatTimeAgo(now),
                acknowledged: false
            });
        }

        if (pendingAppointmentsCount > 0) {
            alerts.push({
                id: 'appointments-pending',
                severity: pendingAppointmentsCount > 20 ? 'high' : 'medium',
                message: `${pendingAppointmentsCount} rendez-vous en attente de validation`,
                time: formatTimeAgo(now),
                acknowledged: false
            });
        }

        if (pendingDoctorActions > 0) {
            alerts.push({
                id: 'doctors-pending-actions',
                severity: pendingDoctorActions > 10 ? 'medium' : 'low',
                message: `${pendingDoctorActions} actions médecins en attente`,
                time: formatTimeAgo(now),
                acknowledged: false
            });
        }

        if (requestsPerMin > 180 || cpu > 80) {
            alerts.push({
                id: 'traffic-spike',
                severity: requestsPerMin > 260 || cpu > 90 ? 'high' : 'medium',
                message: `Pic de charge détecté (CPU ${cpu}% - ${requestsPerMin} req/min)`,
                time: formatTimeAgo(now),
                acknowledged: false
            });
        }

        if (unreadNotifications > 150) {
            alerts.push({
                id: 'notifications-backlog',
                severity: unreadNotifications > 300 ? 'high' : 'medium',
                message: `File de notifications élevée (${unreadNotifications} non lues)`,
                time: formatTimeAgo(now),
                acknowledged: false
            });
        }

        return res.json(alerts);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/system-logs', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        const [latestNotifications, latestAppointments, unreadNotifications] = await Promise.all([
            prisma.notification.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: {
                    utilisateur: {
                        select: {
                            email: true
                        }
                    }
                }
            }),
            prisma.rendezVous.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: {
                    patient: {
                        include: {
                            utilisateur: {
                                select: {
                                    prenom: true,
                                    nom: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.notification.count({ where: { lue: false } })
        ]);

        const logs = [
            ...latestNotifications.map((n) => ({
                timestamp: n.createdAt.toISOString(),
                level: n.lue ? 'info' : 'warning',
                message: n.message || n.titre || 'Notification système',
                user: n.utilisateur?.email || null,
                source: 'notification'
            })),
            ...latestAppointments.map((a) => ({
                timestamp: a.updatedAt.toISOString(),
                level: a.statut === 'ANNULE' ? 'warning' : a.statut === 'EN_ATTENTE' ? 'warning' : 'info',
                message: `RDV ${String(a.statut).toLowerCase()} - ${a.patient?.utilisateur?.prenom || ''} ${a.patient?.utilisateur?.nom || ''}`.trim(),
                endpoint: '/api/admin/appointments',
                source: 'appointment'
            })),
            {
                timestamp: new Date().toISOString(),
                level: unreadNotifications > 200 ? 'warning' : 'info',
                message:
                    unreadNotifications > 200
                        ? `Backlog notifications élevé (${unreadNotifications} non lues)`
                        : 'Service notifications stable',
                source: 'monitoring'
            }
        ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        return res.json(logs);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/subadmins', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const subadmins = await prisma.sousAdmin.findMany({
            include: {
                utilisateur: true,
                _count: {
                    select: {
                        rendezVousGeres: true,
                        salleAttente: true
                    }
                }
            },
            where: search
                ? {
                      OR: [
                          { utilisateur: { nom: { contains: search, mode: 'insensitive' } } },
                          { utilisateur: { prenom: { contains: search, mode: 'insensitive' } } },
                          { utilisateur: { email: { contains: search, mode: 'insensitive' } } }
                      ]
                  }
                : undefined
        });

        return res.json(
            subadmins.map((sa) => ({
                id: sa.id,
                utilisateurId: sa.utilisateurId,
                name: `${sa.utilisateur.prenom} ${sa.utilisateur.nom}`,
                prenom: sa.utilisateur.prenom,
                nom: sa.utilisateur.nom,
                email: sa.utilisateur.email,
                specialty: sa.specialite || '',
                phone: sa.phone || '',
                permissions: sa.permissions || [],
                waitingRoomCount: sa._count.salleAttente,
                appointmentsCount: sa._count.rendezVousGeres,
                status: sa.status || 'actif'
            }))
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/subadmins', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const missingConfig = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
            .filter((key) => !process.env[key]);
        if (missingConfig.length > 0) {
            return res.status(503).json({
                error: `Envoi email indisponible (config SMTP manquante: ${missingConfig.join(', ')})`
            });
        }

        const body = req.body || {};
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const tempPassword = `Tmp#${Date.now().toString(36)}${Math.random().toString(36).slice(-6)}`;
        const fullName =
            (typeof body.fullName === 'string' ? body.fullName.trim() : '') ||
            (typeof body.name === 'string' ? body.name.trim() : '');

        const specialty =
            (typeof body.specialty === 'string' ? body.specialty : undefined) ??
            (typeof body.specialite === 'string' ? body.specialite : undefined) ??
            '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : 'actif';
        const permissions = Array.isArray(body.permissions)
            ? body.permissions.map((item: unknown) => String(item)).filter(Boolean)
            : [];

        const nomFromBody = typeof body.nom === 'string' ? body.nom.trim() : undefined;
        const prenomFromBody = typeof body.prenom === 'string' ? body.prenom.trim() : undefined;

        if (!email) {
            return res.status(400).json({ error: 'email est requis' });
        }
        if (!specialty) {
            return res.status(400).json({ error: 'specialty (specialite) est requis' });
        }

        const existing = await prisma.utilisateur.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Cet email est deja utilise' });
        }

        let prenom = prenomFromBody;
        let nom = nomFromBody;
        if ((!prenom || !nom) && fullName) {
            const parts = fullName.split(/\s+/).filter(Boolean);
            prenom = parts[0];
            nom = parts.slice(1).join(' ');
        }
        if (!prenom) prenom = 'Sous';
        if (!nom) nom = 'Admin';

        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const specialiteNorm = normalizeSpecialty(specialty) || null;

        const created = await prisma.utilisateur.create({
            data: {
                email,
                motDePasse: hashedPassword,
                nom: nom,
                prenom: prenom,
                role: 'SOUS_ADMIN',
                sousAdmin: {
                    create: {
                        specialite: specialiteNorm || null,
                        phone: phone || null,
                        status: status || 'actif',
                        permissions
                    }
                }
            },
            include: {
                sousAdmin: true
            }
        });

        const contactName = `${created.prenom} ${created.nom}`.trim();
        try {
            await sendAccountCredentialsEmail(
                created.email,
                contactName,
                created.email,
                tempPassword,
                'Sous-administrateur'
            );
        } catch (mailErr) {
            await prisma.utilisateur.delete({ where: { id: created.id } });
            console.error('[MAIL][SUBADMIN] Account creation reverted because email sending failed:', mailErr);
            const smtpAuthFailed = (mailErr as any)?.code === 'EAUTH' || String((mailErr as any)?.response || '').includes('535');
            return res.status(502).json({
                error: smtpAuthFailed
                    ? "Compte non créé: authentification SMTP invalide (Gmail refuse l'identifiant/mot de passe)."
                    : "Compte non créé: l'email des identifiants n'a pas pu être envoyé."
            });
        }

        return res.status(201).json({
            id: created.sousAdmin?.id ?? null,
            utilisateurId: created.id,
            email: created.email,
            nom: created.nom,
            prenom: created.prenom,
            specialty: created.sousAdmin?.specialite || '',
            phone: created.sousAdmin?.phone || '',
            permissions: created.sousAdmin?.permissions || [],
            status: created.sousAdmin?.status || 'actif',
            warning: null
        });
    } catch (err) {
        console.error(err);
        if ((err as any)?.code === 'P2002') {
            return res.status(409).json({ error: 'Cet email est deja utilise' });
        }
        if ((err as any)?.code === 'P1001') {
            return res.status(503).json({ error: 'Base de donnees indisponible. Reessayez dans quelques instants.' });
        }
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/subadmins/:utilisateurId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const utilisateurId = parseInt(String(req.params.utilisateurId), 10);
        if (Number.isNaN(utilisateurId)) return res.status(400).json({ error: 'utilisateurId invalide' });

        const body = req.body || {};
        const email = typeof body.email === 'string' ? body.email.trim() : undefined;
        const nom = typeof body.nom === 'string' ? body.nom.trim() : undefined;
        const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : undefined;

        const specialty =
            (typeof body.specialty === 'string' ? body.specialty : undefined) ??
            (typeof body.specialite === 'string' ? body.specialite : undefined) ??
            undefined;
        const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
        const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : undefined;
        const permissions = Array.isArray(body.permissions)
            ? body.permissions.map((item: unknown) => String(item)).filter(Boolean)
            : undefined;

        const util = await prisma.utilisateur.findUnique({
            where: { id: utilisateurId },
            include: { sousAdmin: true }
        });
        if (!util || !util.sousAdmin) return res.status(404).json({ error: 'Sous-admin non trouve' });
        if (util.role !== 'SOUS_ADMIN') return res.status(403).json({ error: 'Role invalide' });

        const updated = await prisma.utilisateur.update({
            where: { id: utilisateurId },
            data: {
                ...(email !== undefined ? { email } : {}),
                ...(nom !== undefined ? { nom } : {}),
                ...(prenom !== undefined ? { prenom } : {}),
                ...(specialty !== undefined
                    ? {
                          sousAdmin: {
                              update: {
                                  specialite: normalizeSpecialty(specialty) || null,
                                  ...(phone !== undefined ? { phone: phone || null } : {}),
                                  ...(status !== undefined ? { status: status || 'actif' } : {}),
                                  ...(permissions !== undefined ? { permissions } : {})
                              }
                          }
                      }
                    : {
                          sousAdmin: {
                              update: {
                                  ...(phone !== undefined ? { phone: phone || null } : {}),
                                  ...(status !== undefined ? { status: status || 'actif' } : {}),
                                  ...(permissions !== undefined ? { permissions } : {})
                              }
                          }
                      })
            },
            include: { sousAdmin: true }
        });

        return res.json({
            id: updated.sousAdmin?.id ?? null,
            utilisateurId: updated.id,
            email: updated.email,
            nom: updated.nom,
            prenom: updated.prenom,
            specialty: updated.sousAdmin?.specialite || '',
            phone: updated.sousAdmin?.phone || '',
            permissions: updated.sousAdmin?.permissions || [],
            status: updated.sousAdmin?.status || 'actif'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/subadmins/:utilisateurId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const utilisateurId = parseInt(String(req.params.utilisateurId), 10);
        if (Number.isNaN(utilisateurId)) return res.status(400).json({ error: 'utilisateurId invalide' });

        const util = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
        if (!util) return res.status(404).json({ error: 'Utilisateur non trouve' });
        if (util.role !== 'SOUS_ADMIN') return res.status(403).json({ error: 'Role invalide' });

        await prisma.utilisateur.delete({ where: { id: utilisateurId } });
        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/patients', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const patients = await prisma.patient.findMany({
            include: {
                utilisateur: true,
                dossierMedical: {
                    select: {
                        dateNaissance: true,
                        groupeSanguin: true,
                        numSecuriteSociale: true,
                        allergies: true,
                        historiqueMedical: true
                    }
                }
            },
            where: search
                ? {
                      OR: [
                          { utilisateur: { nom: { contains: search, mode: 'insensitive' } } },
                          { utilisateur: { prenom: { contains: search, mode: 'insensitive' } } },
                          { utilisateur: { email: { contains: search, mode: 'insensitive' } } }
                      ]
                  }
                : undefined,
            orderBy: { utilisateur: { nom: 'asc' } }
        });

        return res.json(
            patients.map((p) => ({
                id: p.id,
                utilisateurId: p.utilisateurId,
                prenom: p.utilisateur.prenom,
                nom: p.utilisateur.nom,
                email: p.utilisateur.email,
                telephone: p.telephone || null,
                birthDate: p.dossierMedical?.dateNaissance || null,
                bloodGroup: p.dossierMedical?.groupeSanguin || null,
                socialSecurity: p.dossierMedical?.numSecuriteSociale || null,
                allergies: p.dossierMedical?.allergies || [],
                history: p.dossierMedical?.historiqueMedical || []
            }))
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/doctors', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const searchSpecialty = typeof req.query.specialite === 'string' ? req.query.specialite : undefined;
        const searchSpecialty2 = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;
        const targetSpecialty = normalizeSpecialty(searchSpecialty2 ?? searchSpecialty);

        const day = parseDayParam(req.query.date);
        const { start, end } = toStartEndOfDay(day);

        const doctors = await prisma.medecin.findMany({
            include: {
                utilisateur: true,
                conges: {
                    where: {
                        startDate: { lte: end },
                        endDate: { gte: start }
                    }
                }
            },
            orderBy: {
                utilisateur: { createdAt: 'asc' }
            }
        });

        const filtered = targetSpecialty
            ? doctors.filter((doc) => normalizeSpecialty(doc.specialite) === targetSpecialty)
            : doctors;

        const refDate = day;
        const docIds = filtered.map((d) => d.id);

        const now = new Date();
        const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const rdvs = await prisma.rendezVous.findMany({
            where: {
                medecinId: { in: docIds.length ? docIds : [0] },
                date: { gte: since, lte: now },
                statut: { not: 'ANNULE' as any }
            },
            select: { medecinId: true, patientId: true, statut: true }
        });

        const patientsByDoctor = new Map<number, Set<number>>();
        const consultationsByDoctor = new Map<number, number>();
        for (const r of rdvs) {
            const set = patientsByDoctor.get(r.medecinId) || new Set<number>();
            set.add(r.patientId);
            patientsByDoctor.set(r.medecinId, set);
            if (r.statut === 'TERMINE') {
                consultationsByDoctor.set(r.medecinId, (consultationsByDoctor.get(r.medecinId) || 0) + 1);
            }
        }

        return res.json(
            filtered.map((doc) => {
                const status = mapDoctorStatusFromConges(
                    doc.conges as any,
                    refDate
                );
                const fullName = `${doc.utilisateur.prenom} ${doc.utilisateur.nom}`.trim();
                const initials = computeInitials(fullName);
                const color = computeAvatarColor(doc.specialite || '');
                const patients = patientsByDoctor.get(doc.id)?.size || 0;
                const consultations = consultationsByDoctor.get(doc.id) || 0;

                return {
                    id: doc.id,
                    utilisateurId: doc.utilisateurId,
                    name: fullName,
                    prenom: doc.utilisateur.prenom,
                    nom: doc.utilisateur.nom,
                    email: doc.utilisateur.email,
                    specialty: doc.specialite || '',
                    status,
                    patients,
                    consultations,
                    initials,
                    color,
                    phone: doc.phone || '',
                    address: doc.address || '',
                    licenseNumber: doc.licenseNumber || ''
                };
            })
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/doctors', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const missingConfig = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
            .filter((key) => !process.env[key]);
        if (missingConfig.length > 0) {
            return res.status(503).json({
                error: `Envoi email indisponible (config SMTP manquante: ${missingConfig.join(', ')})`
            });
        }

        const body = req.body || {};
        const nameRaw =
            (typeof body.name === 'string' ? body.name : undefined) ||
            (typeof body.fullName === 'string' ? body.fullName : undefined);
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const specialty =
            (typeof body.specialty === 'string' ? body.specialty : undefined) ||
            (typeof body.specialite === 'string' ? body.specialite : undefined) ||
            '';
        const status = toDoctorStatus(typeof body.status === 'string' ? body.status : 'actif');
        const doctorPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const tempPassword = `Tmp#${Date.now().toString(36)}${Math.random().toString(36).slice(-6)}`;

        if (!nameRaw || !email || !specialty) {
            return res.status(400).json({ error: 'name, email et specialty sont requis' });
        }

        const { prenom, nom } = buildNameParts(nameRaw);

        const existing = await prisma.utilisateur.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'Email deja utilise' });

        const createdUser = await prisma.utilisateur.create({
            data: {
                email,
                motDePasse: await bcrypt.hash(tempPassword, 10),
                nom,
                prenom,
                role: 'MEDECIN',
                medecin: {
                    create: {
                        specialite: String(specialty).trim(),
                        phone: doctorPhone || null,
                        address: typeof body.address === 'string' ? body.address.trim() || null : null,
                        licenseNumber:
                            typeof body.licenseNumber === 'string' ? body.licenseNumber.trim() || null : null
                    }
                }
            },
            include: { medecin: true }
        });

        const medecin = createdUser.medecin!;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (status !== 'actif') {
            await prisma.conge.deleteMany({
                where: {
                    medecinId: medecin.id,
                    startDate: { lte: new Date('2100-01-01') },
                    endDate: { gte: new Date('2000-01-01') }
                }
            });
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            if (status === 'congé') {
                await prisma.conge.create({
                    data: {
                        medecinId: medecin.id,
                        startDate: today,
                        endDate: new Date(today.getTime() + thirtyDaysMs),
                        reason: 'CONGE'
                    }
                });
            } else if (status === 'inactif') {
                await prisma.conge.create({
                    data: {
                        medecinId: medecin.id,
                        startDate: today,
                        endDate: new Date('2099-12-31T23:59:59Z'),
                        reason: 'INACTIF'
                    }
                });
            }
        }

        const fullName = `${createdUser.prenom} ${createdUser.nom}`.trim();
        try {
            await sendAccountCredentialsEmail(
                createdUser.email,
                fullName,
                createdUser.email,
                tempPassword,
                'Médecin'
            );
        } catch (mailErr) {
            await prisma.utilisateur.delete({ where: { id: createdUser.id } });
            console.error('[MAIL][DOCTOR] Account creation reverted because email sending failed:', mailErr);
            const smtpAuthFailed = (mailErr as any)?.code === 'EAUTH' || String((mailErr as any)?.response || '').includes('535');
            return res.status(502).json({
                error: smtpAuthFailed
                    ? "Compte non créé: authentification SMTP invalide (Gmail refuse l'identifiant/mot de passe)."
                    : "Compte non créé: l'email des identifiants n'a pas pu être envoyé."
            });
        }

        return res.status(201).json({
            id: medecin.id,
            utilisateurId: createdUser.id,
            name: fullName,
            specialty: medecin.specialite || '',
            email: createdUser.email,
            status,
            patients: 0,
            consultations: 0,
            initials: computeInitials(fullName),
            color: computeAvatarColor(medecin.specialite || ''),
            phone: medecin.phone || '',
            address: medecin.address || '',
            licenseNumber: medecin.licenseNumber || '',
            warning: null
        });
    } catch (err) {
        console.error(err);
        if ((err as any)?.code === 'P2002') {
            return res.status(409).json({ error: 'Email deja utilise' });
        }
        if ((err as any)?.code === 'P1001') {
            return res.status(503).json({ error: 'Base de donnees indisponible. Reessayez dans quelques instants.' });
        }
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/doctors/:medecinId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const medecinId = parseInt(String(req.params.medecinId), 10);
        if (Number.isNaN(medecinId)) return res.status(400).json({ error: 'medecinId invalide' });

        const body = req.body || {};
        const nameRaw =
            (typeof body.name === 'string' ? body.name : undefined) ||
            (typeof body.fullName === 'string' ? body.fullName : undefined);
        const email = typeof body.email === 'string' ? body.email.trim() : undefined;
        const specialty =
            (typeof body.specialty === 'string' ? body.specialty : undefined) ||
            (typeof body.specialite === 'string' ? body.specialite : undefined);
        const status =
            typeof body.status === 'string'
                ? toDoctorStatus(body.status)
                : undefined;
        const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : undefined;
        const addressRaw = typeof body.address === 'string' ? body.address.trim() : undefined;
        const licenseNumberRaw =
            typeof body.licenseNumber === 'string' ? body.licenseNumber.trim() : undefined;
        const phone =
            phoneRaw === undefined ? undefined : (phoneRaw === '' ? null : phoneRaw);
        const address =
            addressRaw === undefined ? undefined : (addressRaw === '' ? null : addressRaw);
        const licenseNumber =
            licenseNumberRaw === undefined ? undefined : (licenseNumberRaw === '' ? null : licenseNumberRaw);

        const medecin = await prisma.medecin.findUnique({
            where: { id: medecinId },
            include: { utilisateur: true }
        });
        if (!medecin || !medecin.utilisateur) return res.status(404).json({ error: 'Médecin non trouvé' });
        const utilisateurId = medecin.utilisateurId;

        if (email) {
            const exists = await prisma.utilisateur.findUnique({ where: { email } });
            if (exists && exists.id !== utilisateurId) return res.status(409).json({ error: 'Email deja utilise' });
        }

        let prenomUpdate: string | undefined;
        let nomUpdate: string | undefined;
        if (nameRaw) {
            const parts = buildNameParts(nameRaw);
            prenomUpdate = parts.prenom;
            nomUpdate = parts.nom;
        }

        await prisma.$transaction([
            prisma.utilisateur.update({
                where: { id: utilisateurId },
                data: {
                    ...(email !== undefined ? { email } : {}),
                    ...(prenomUpdate !== undefined ? { prenom: prenomUpdate } : {}),
                    ...(nomUpdate !== undefined ? { nom: nomUpdate } : {})
                }
            }),
            specialty !== undefined
                ? prisma.medecin.update({
                      where: { id: medecinId },
                      data: {
                          specialite: String(specialty).trim(),
                          ...(phone !== undefined ? { phone } : {}),
                          ...(address !== undefined ? { address } : {}),
                          ...(licenseNumber !== undefined ? { licenseNumber } : {})
                      }
                  })
                : prisma.medecin.update({
                      where: { id: medecinId },
                      data: {
                          ...(phone !== undefined ? { phone } : {}),
                          ...(address !== undefined ? { address } : {}),
                          ...(licenseNumber !== undefined ? { licenseNumber } : {})
                      }
                  })
        ]);

        if (status !== undefined) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.conge.deleteMany({
                where: {
                    medecinId,
                    startDate: { lte: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000) },
                    endDate: { gte: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) }
                }
            });

            if (status !== 'actif') {
                const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                if (status === 'congé') {
                    await prisma.conge.create({
                        data: {
                            medecinId,
                            startDate: today,
                            endDate: new Date(today.getTime() + thirtyDaysMs),
                            reason: 'CONGE'
                        }
                    });
                } else if (status === 'inactif') {
                    await prisma.conge.create({
                        data: {
                            medecinId,
                            startDate: today,
                            endDate: new Date('2099-12-31T23:59:59Z'),
                            reason: 'INACTIF'
                        }
                    });
                }
            }
        }

        const updated = await prisma.medecin.findUnique({
            where: { id: medecinId },
            include: { utilisateur: true, conges: true }
        });
        if (!updated) return res.status(404).json({ error: 'Médecin non trouvé' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mappedStatus = mapDoctorStatusFromConges(updated.conges as any, today);
        const fullName = `${updated.utilisateur.prenom} ${updated.utilisateur.nom}`.trim();

        return res.json({
            id: updated.id,
            utilisateurId: updated.utilisateurId,
            name: fullName,
            specialty: updated.specialite || '',
            email: updated.utilisateur.email,
            status: mappedStatus,
            patients: 0,
            consultations: 0,
            initials: computeInitials(fullName),
            color: computeAvatarColor(updated.specialite || ''),
            phone: updated.phone || '',
            address: updated.address || '',
            licenseNumber: updated.licenseNumber || ''
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/doctors/:medecinId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const medecinId = parseInt(String(req.params.medecinId), 10);
        if (Number.isNaN(medecinId)) return res.status(400).json({ error: 'medecinId invalide' });

        const medecin = await prisma.medecin.findUnique({
            where: { id: medecinId },
            include: { utilisateur: true }
        });
        if (!medecin || !medecin.utilisateur) return res.status(404).json({ error: 'Médecin non trouvé' });

        await prisma.utilisateur.delete({ where: { id: medecin.utilisateurId } });
        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/appointments', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const day = parseDayParam(req.query.date);
        const { start, end } = toStartEndOfDay(day);
        const statutRaw = typeof req.query.statut === 'string' ? req.query.statut.trim().toUpperCase() : '';
        const statut = statutRaw ? (statutRaw as any) : undefined;

        const appointments = await prisma.rendezVous.findMany({
            where: {
                date: { gte: start, lte: end },
                ...(statut ? { statut } : {})
            },
            include: {
                patient: { include: { utilisateur: true } },
                medecin: { include: { utilisateur: true } },
                sousAdmin: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        return res.json(
            appointments.map((apt) => ({
                id: apt.id,
                date: formatAppointmentCalendarDateKey(apt.date),
                time: formatAppointmentTime(apt.date),
                patientId: apt.patientId,
                patientName: `${apt.patient.utilisateur.prenom} ${apt.patient.utilisateur.nom}`,
                doctor: apt.medecin
                    ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                    : null,
                specialite: apt.medecin?.specialite || apt.specialite || '',
                sousAdminId: apt.sousAdminId ?? null,
                lieu: apt.lieu || null,
                salle: apt.salle || null,
                motif: stripAppointmentMotifTags(apt.motif),
                statut: apt.statut
            }))
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;

