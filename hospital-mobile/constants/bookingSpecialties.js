
export const BOOKING_SPECIALTIES = [
    { value: 'Cardiologie', nameKey: 'cardiology', icon: 'activity' },
    { value: 'Dermatologie', nameKey: 'dermatology', icon: 'sun' },
    { value: 'Médecine générale', nameKey: 'generalPractitioner', icon: 'user' },
    { value: 'Chirurgie', nameKey: 'chirurgie', icon: 'scissors' },
    { value: 'Pédiatrie', nameKey: 'pediatrics', icon: 'users' },
    { value: 'Gynécologie', nameKey: 'gynecology', icon: 'baby-face-outline', iconType: 'MaterialCommunityIcons' },
    { value: 'Neurologie', nameKey: 'neurologie', icon: 'brain', iconType: 'MaterialCommunityIcons' },
    { value: 'Ophtalmologie', nameKey: 'ophthalmology', icon: 'eye' },
    { value: 'Radiologie', nameKey: 'radiologie', icon: 'aperture' },
    { value: 'Psychiatrie', nameKey: 'psychiatrie', icon: 'moon' },
];

const RAW_TO_I18N = {
    Cardiologie: 'cardiology',
    Dermatologie: 'dermatology',
    'Médecine générale': 'generalPractitioner',
    Chirurgie: 'chirurgie',
    Pédiatrie: 'pediatrics',
    Gynécologie: 'gynecology',
    Neurologie: 'neurologie',
    Ophtalmologie: 'ophthalmology',
    Radiologie: 'radiologie',
    Psychiatrie: 'psychiatrie',
    cardiology: 'cardiology',
    dermatology: 'dermatology',
    generalPractitioner: 'generalPractitioner',
    gynecology: 'gynecology',
    ophthalmology: 'ophthalmology',
    orthopedics: 'orthopedics',
    pediatrics: 'pediatrics',
    rheumatology: 'rheumatology',
    urology: 'urology',
};

export function specialtyToI18nKey(raw) {
    if (raw == null || raw === '') return 'notSpecified';
    const s = String(raw).trim();
    if (RAW_TO_I18N[s]) return RAW_TO_I18N[s];
    const collapsed = s.replace(/\s+/g, ' ');
    return RAW_TO_I18N[collapsed] || s;
}
