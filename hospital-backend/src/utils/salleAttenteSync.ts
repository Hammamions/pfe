import { PrismaClient } from '@prisma/client';

/** Début / fin du jour local (serveur) pour filtrer les RDV « aujourd’hui ». */
export function getTodayRange(now: Date = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

export function isDateToday(d: Date, now: Date = new Date()) {
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}

function queueStatusFromPresence(p: 'PREVU' | 'PRESENT' | 'EN_RETARD' | 'ANNULE' | 'ABSENT') {
    return p === 'PRESENT' ? 'EN_CONSULTATION' : 'EN_ATTENTE';
}

/**
 * Pour un sous-admin : une ligne SalleAttente par patient ayant un RDV du jour (confirmé / en cours).
 * Recopie isUrgent et presenceStatus depuis le rendez-vous ; met à jour si la ligne existe déjà.
 */
export async function ensureSalleAttenteForTodaysAppointments(prisma: PrismaClient, sousAdminId: number) {
    const { start, end } = getTodayRange();

    // 1. Fetch relevant appointments
    const rdvs = await prisma.rendezVous.findMany({
        where: {
            sousAdminId,
            date: { gte: start, lte: end },
            statut: { in: ['CONFIRME', 'EN_COURS'] }
        },
        orderBy: { date: 'asc' }
    });

    if (rdvs.length === 0) return;

    // 2. Fetch all current waiting room entries for this SA today
    const existingEntries = await prisma.salleAttente.findMany({
        where: {
            sousAdminId,
            // To be precise on "today", though joinedAt is usually enough
            joinedAt: { gte: start, lte: end }
        }
    });

    const entriesMap = new Map<number, (typeof existingEntries)[0]>();
    existingEntries.forEach(e => entriesMap.set(e.patientId, e));

    // 3. Determine who needs to be created or updated
    const patientsProcessed = new Set<number>();

    for (const r of rdvs) {
        if (patientsProcessed.has(r.patientId)) continue;
        patientsProcessed.add(r.patientId);

        const targetStatus = queueStatusFromPresence('PREVU'); // Default status in sync
        const existing = entriesMap.get(r.patientId);

        if (!existing) {
            await prisma.salleAttente.create({
                data: {
                    sousAdminId,
                    patientId: r.patientId,
                    status: targetStatus,
                }
            });
        }
        // Note: We don't necessarily update existing entries here to avoid unnecessary DB calls, 
        // unless their status is fundamentally different. 
    }
}
