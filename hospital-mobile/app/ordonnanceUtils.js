
export function normalizeOrdonnanceContenu(raw) {
    if (raw == null) return null;
    if (typeof raw === 'object') {
        try {
            return JSON.stringify(raw);
        } catch {
            return null;
        }
    }
    const s = String(raw).trim();
    if (!s) return null;
    try {
        let v = JSON.parse(s);
        if (typeof v === 'string') {
            v = JSON.parse(v);
        }
        return typeof v === 'object' && v !== null ? JSON.stringify(v) : s;
    } catch {
        return s;
    }
}

export function inferOrdonnanceSubCategory(contenu) {
    const normalized = normalizeOrdonnanceContenu(contenu);
    if (!normalized) return 'medicamenteuse';
    let j;
    try {
        j = JSON.parse(normalized);
    } catch {
        return 'medicamenteuse';
    }
    if (!j || typeof j !== 'object') return 'medicamenteuse';

    if (Array.isArray(j.medications) && j.medications.length > 0) {
        return 'medicamenteuse';
    }

    const notes = String(j.notes || '').toLowerCase();
    const lines = Array.isArray(j.medications) ? j.medications : [];
    const medBlob = lines
        .map((m) => `${m?.nom || ''} ${m?.dosage || ''} ${m?.instructions || ''}`)
        .join(' ')
        .toLowerCase();
    const blob = `${notes} ${medBlob}`;

    if (/kin[ée]s|kinésithérapie|r[ée]education|r[ée]éducation|kiné|physio/.test(blob)) {
        return 'kinesitherapie';
    }
    if (/soins?\s*infirmier|pansement|injection|perfusion|stomat|aide\s*soignant/.test(blob)) {
        return 'soins_infirmiers';
    }
    return 'medicamenteuse';
}

export function getOrdonnanceMedicationsAndNotes(contenu) {
    const normalized = normalizeOrdonnanceContenu(contenu);
    if (!normalized) return { items: null, notes: '', plain: null };
    try {
        const j = JSON.parse(normalized);
        if (j.medications && Array.isArray(j.medications)) {
            return { items: j.medications, notes: j.notes || '', plain: null };
        }
        if (j.notes) {
            return { items: null, notes: String(j.notes), plain: null };
        }
    } catch {
    }
    return { items: null, notes: '', plain: normalized };
}
