export const normalizeSpecialty = (value: string | null | undefined) => {
    if (!value) return '';
    const raw = value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');

    const aliases: Record<string, string> = {
        cardiologie: 'cardiology',
        dermatologie: 'dermatology',
        dermetology: 'dermatology',
        dermetologie: 'dermatology',
        generaliste: 'generalpractitioner',
        medecinegenerale: 'generalpractitioner',
        gynecologie: 'gynecology',
        ophtalmologie: 'ophthalmology',
        orthopedie: 'orthopedics',
        pediatrie: 'pediatrics',
        rheumatologie: 'rheumatology',
        urologie: 'urology',
        surgery: 'chirurgie',
        neurology: 'neurologie',
        radiology: 'radiologie',
        psychiatry: 'psychiatrie'
    };

    return aliases[raw] || raw;
};

export function specialtyLabelFr(value: string | null | undefined): string {
    if (!value || !String(value).trim()) return '—';
    const n = normalizeSpecialty(value);
    const labels: Record<string, string> = {
        cardiology: 'Cardiologie',
        dermatology: 'Dermatologie',
        generalpractitioner: 'Médecine générale',
        gynecology: 'Gynécologie',
        ophthalmology: 'Ophtalmologie',
        orthopedics: 'Orthopédie',
        pediatrics: 'Pédiatrie',
        rheumatology: 'Rhumatologie',
        urology: 'Urologie',
        chirurgie: 'Chirurgie',
        neurologie: 'Neurologie',
        radiologie: 'Radiologie',
        psychiatrie: 'Psychiatrie'
    };
    if (n && labels[n]) return labels[n];
    const t = String(value).trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
}