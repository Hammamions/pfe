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
        urologie: 'urology'
    };

    return aliases[raw] || raw;
};
