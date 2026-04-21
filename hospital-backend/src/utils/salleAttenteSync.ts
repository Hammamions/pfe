import { PrismaClient } from '@prisma/client';


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


export async function ensureSalleAttenteForTodaysAppointments(prisma: PrismaClient, sousAdminId: number) {
    const { start, end } = getTodayRange();

    const rdvs = await prisma.rendezVous.findMany({
        where: {
            sousAdminId,
            date: { gte: start, lte: end },
            statut: { in: ['CONFIRME', 'EN_COURS'] }
        },
        orderBy: { date: 'asc' }
    });

    if (rdvs.length === 0) return;

    const existingEntries = await prisma.salleAttente.findMany({
        where: {
            sousAdminId,
            joinedAt: { gte: start, lte: end }
        }
    });

    const entriesMap = new Map<number, (typeof existingEntries)[0]>();
    existingEntries.forEach(e => entriesMap.set(e.patientId, e));

    const patientsProcessed = new Set<number>();

    for (const r of rdvs) {
        if (patientsProcessed.has(r.patientId)) continue;
        patientsProcessed.add(r.patientId);

        const targetStatus = queueStatusFromPresence('PREVU'); 
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

    }
}