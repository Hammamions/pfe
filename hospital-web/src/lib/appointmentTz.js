export const APPOINTMENT_DISPLAY_TZ = 'Europe/Paris';

export function calendarDateKeyInTz(d, timeZone = APPOINTMENT_DISPLAY_TZ) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}


export function utcInstantFromWallClock(dateKey, hour, minute, timeZone = APPOINTMENT_DISPLAY_TZ) {
    const ymd = String(dateKey || '').trim();
    const partsYmd = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const h = Number(hour);
    const m = Number(minute);
    if (!partsYmd || !Number.isFinite(h) || !Number.isFinite(m)) {
        return new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
    }
    const y = Number(partsYmd[1]);
    const M = Number(partsYmd[2]);
    const d = Number(partsYmd[3]);

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const read = (tMs) => {
        const o = {};
        for (const p of formatter.formatToParts(new Date(tMs))) {
            if (p.type !== 'literal') o[p.type] = p.value;
        }
        return {
            y: Number(o.year),
            M: Number(o.month),
            d: Number(o.day),
            h: Number(o.hour),
            mi: Number(o.minute),
        };
    };

    const matches = (tMs) => {
        const L = read(tMs);
        return L.y === y && L.M === M && L.d === d && L.h === h && L.mi === m;
    };

    const center = Date.UTC(y, M - 1, d, 12, 0, 0, 0);
    for (let stepMin = -36 * 60; stepMin <= 36 * 60; stepMin += 1) {
        const tMs = center + stepMin * 60 * 1000;
        if (matches(tMs)) return new Date(tMs);
    }

    let best = null;
    let bestScore = Infinity;
    for (let stepMin = -36 * 60; stepMin <= 36 * 60; stepMin += 1) {
        const tMs = center + stepMin * 60 * 1000;
        const L = read(tMs);
        if (L.y !== y || L.M !== M || L.d !== d) continue;
        const score = Math.abs(L.h * 60 + L.mi - (h * 60 + m));
        if (score < bestScore) {
            bestScore = score;
            best = tMs;
        }
    }
    return best != null ? new Date(best) : new Date(`${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
}
