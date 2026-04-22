
export const PRO_WEB_LANG_KEY = 'hospitalWebLang';
export const PRO_WEB_LANG_EVENT = 'hospitalWebLangChange';

const VALID = new Set(['fr', 'en', 'ar']);

export function getProWebLang() {
    try {
        const v = localStorage.getItem(PRO_WEB_LANG_KEY);
        return VALID.has(v) ? v : 'fr';
    } catch {
        return 'fr';
    }
}

export function setProWebLang(lang) {
    const next = VALID.has(lang) ? lang : 'fr';
    try {
        localStorage.setItem(PRO_WEB_LANG_KEY, next);
    } catch {
    }
    window.dispatchEvent(new CustomEvent(PRO_WEB_LANG_EVENT));
}

const STR = {
    fr: {
        navDashboard: 'Tableau de bord',
        navAppointments: 'Rendez-vous',
        logout: 'Déconnexion',
        subAdminBadge: 'Secrétaire',

        dashboardEyebrow: 'Tableau de bord',
        dashboardStrategic: 'Vue stratégique du service et des flux de patients.',
        pilotagePrefix: 'Pilotage',
        heroIconRdv: 'RDV',
        heroIconSlots: 'Créneaux',

        kpiAction: 'Action',
        kpiPendingTitle: 'Demandes à traiter',
        kpiDispo: 'Dispo',
        kpiSlotsTitle: 'Slots disponibles',
        kpiConfirmed: 'Confirmés',

        latestTitle: 'Dernières demandes',
        latestSubtitle: 'Nouveaux rendez-vous, demandes médecin, reports et annulations.',
        manageAll: 'Tout gérer',
        badgeNew: 'Nouveau RDV',
        badgeDoctor: 'Médecin',
        badgeCancel: 'Annulation',
        badgeReschedule: 'Report',
        treat: 'Traiter',
        noRequests: 'Aucune demande à traiter',

        recentTitle: 'Flux récents',
        recentSubtitle: 'Notifications récentes du système.',
        noActivity: 'Aucune activité récente.',

        docAgenda_dragHint:
            'Glissez-déposez un rendez-vous vers un autre créneau : une demande est envoyée au secrétariat pour validation.',
        docAgenda_tabDaily: 'Vue journalière',
        docAgenda_tabWeekly: 'Vue hebdomadaire',
        docAgenda_tabWaiting: "Salle d'attente",
        docAgenda_title: 'Agenda',
        docAgenda_planningDay: 'Planning du',
        docAgenda_daySubtitle: 'Vos rendez-vous de la journée',
        docAgenda_weekTitle: 'Vue hebdomadaire',
        docAgenda_weekSubtitle: 'Aperçu de votre semaine',
        docAgenda_available: 'Disponible',
        docAgenda_timeCol: 'Horaire',
        docAgenda_confirmMoveTitle: 'Envoyer la demande de report ?',
        docAgenda_confirmMoveDesc:
            'Le secrétariat sera notifié pour traiter le déplacement vers le créneau choisi.',
        docAgenda_confirmSend: 'Envoyer la demande',
        docAgenda_cancel: 'Annuler',
        docAgenda_dropSuccess: 'Demande envoyée au secrétariat. Le créneau sera mis à jour après validation.',
        docAgenda_dropError: "Impossible d'envoyer la demande.",
        docAgenda_sameSlot: 'Créneau identique.',
        docAgenda_slotOccupied: 'Ce créneau contient déjà un autre rendez-vous.',
        docAgenda_dragAria: 'Glisser la carte (ou la poignée) vers un autre créneau pour reprogrammer',
        docAgenda_waitingTitle: "Salle d'attente en temps réel",
        docAgenda_waitingSubtitle: 'Patients enregistrés à l’accueil pour la journée.',
        docAgenda_waitingLiveHint: 'Actualisation automatique toutes les 3 secondes.',
        docAgenda_waitingLiveBadge: 'En direct',
        docAgenda_waitingEmptyTitle: 'Aucun patient en salle',
        docAgenda_waitingEmptyDesc:
            'Lorsqu’un patient s’enregistre à l’accueil, il apparaît ici avec le motif, l’horaire et les informations utiles.',
        docAgenda_waitingPatients0: 'Aucun patient',
        docAgenda_waitingPatients1: '1 patient',
        docAgenda_waitingPatientsMany: '{n} patients',
        docAgenda_waitingStatusPresent: 'présent',
        docAgenda_waitingTime: 'Heure :',
        docAgenda_waitingConsultation: 'Consultation',
        docAgenda_waitingBlood: 'Groupe sanguin :',
        docAgenda_waitingAllergies: 'Allergies :',
        docAgenda_waitingHistory: 'Antécédents :',
        docAgenda_waitingNotSpecified: 'Non précisé',
        docAgenda_waitingNoneAllergies: 'Aucune',
        docAgenda_waitingNoneHistory: 'Aucun',
        docAgenda_waitingRoom: 'Salle',
        docAgenda_loadingAgenda: 'Chargement de l’agenda…',
        docAgenda_loadingWaiting: 'Chargement de la salle d’attente…',
    },
    en: {
        navDashboard: 'Dashboard',
        navAppointments: 'Appointments',
        logout: 'Log out',
        subAdminBadge: 'Secretary',

        dashboardEyebrow: 'Dashboard',
        dashboardStrategic: 'Strategic view of the service and patient flows.',
        pilotagePrefix: 'Operations',
        heroIconRdv: 'Appts',
        heroIconSlots: 'Slots',

        kpiAction: 'Action',
        kpiPendingTitle: 'Requests to process',
        kpiDispo: 'Avail.',
        kpiSlotsTitle: 'Available slots',
        kpiConfirmed: 'Confirmed',

        latestTitle: 'Latest requests',
        latestSubtitle: 'New appointments, physician requests, reschedules and cancellations.',
        manageAll: 'Manage all',
        badgeNew: 'New appt.',
        badgeDoctor: 'Physician',
        badgeCancel: 'Cancellation',
        badgeReschedule: 'Reschedule',
        treat: 'Handle',
        noRequests: 'No pending requests',

        recentTitle: 'Recent feed',
        recentSubtitle: 'Latest system notifications.',
        noActivity: 'No recent activity.',

        docAgenda_dragHint:
            'Drag an appointment to another slot: a request is sent to the secretary office for approval.',
        docAgenda_tabDaily: 'Daily view',
        docAgenda_tabWeekly: 'Weekly view',
        docAgenda_tabWaiting: 'Waiting room',
        docAgenda_title: 'Schedule',
        docAgenda_planningDay: 'Schedule for',
        docAgenda_daySubtitle: "Today's appointments",
        docAgenda_weekTitle: 'Weekly view',
        docAgenda_weekSubtitle: 'Overview of your week',
        docAgenda_available: 'Available',
        docAgenda_timeCol: 'Time',
        docAgenda_confirmMoveTitle: 'Send reschedule request?',
        docAgenda_confirmMoveDesc:
            'The secretary office will be notified to process the move to the selected slot.',
        docAgenda_confirmSend: 'Send request',
        docAgenda_cancel: 'Cancel',
        docAgenda_dropSuccess: 'Request sent to the secretary office. The slot will update after approval.',
        docAgenda_dropError: 'Could not send the request.',
        docAgenda_sameSlot: 'Same slot — no change.',
        docAgenda_slotOccupied: 'This slot already has another appointment.',
        docAgenda_dragAria: 'Drag the card or handle to another slot to reschedule',
        docAgenda_waitingTitle: 'Real-time waiting room',
        docAgenda_waitingSubtitle: 'Patients checked in at reception for today.',
        docAgenda_waitingLiveHint: 'Auto-refresh every 3 seconds.',
        docAgenda_waitingLiveBadge: 'Live',
        docAgenda_waitingEmptyTitle: 'No patients in the waiting room',
        docAgenda_waitingEmptyDesc:
            'When a patient checks in at reception, they appear here with reason, time, and useful details.',
        docAgenda_waitingPatients0: 'No patients',
        docAgenda_waitingPatients1: '1 patient',
        docAgenda_waitingPatientsMany: '{n} patients',
        docAgenda_waitingStatusPresent: 'checked in',
        docAgenda_waitingTime: 'Time:',
        docAgenda_waitingConsultation: 'Consultation',
        docAgenda_waitingBlood: 'Blood group:',
        docAgenda_waitingAllergies: 'Allergies:',
        docAgenda_waitingHistory: 'History:',
        docAgenda_waitingNotSpecified: 'Not specified',
        docAgenda_waitingNoneAllergies: 'None',
        docAgenda_waitingNoneHistory: 'None',
        docAgenda_waitingRoom: 'Room',
        docAgenda_loadingAgenda: 'Loading schedule…',
        docAgenda_loadingWaiting: 'Loading waiting room…',
    },
    ar: {
        navDashboard: 'لوحة التحكم',
        navAppointments: 'المواعيد',
        logout: 'تسجيل الخروج',
        subAdminBadge: 'سكرتارية',

        dashboardEyebrow: 'لوحة التحكم',
        dashboardStrategic: 'نظرة استراتيجية على الخدمة وتدفقات المرضى.',
        pilotagePrefix: 'إدارة',
        heroIconRdv: 'المواعيد',
        heroIconSlots: 'الأوقات',

        kpiAction: 'إجراء',
        kpiPendingTitle: 'طلبات للمعالجة',
        kpiDispo: 'توفر',
        kpiSlotsTitle: 'الأوقات المتاحة',
        kpiConfirmed: 'مؤكد',

        latestTitle: 'آخر الطلبات',
        latestSubtitle: 'مواعيد جديدة، طلبات الأطباء، التأجيل والإلغاء.',
        manageAll: 'إدارة الكل',
        badgeNew: 'موعد جديد',
        badgeDoctor: 'طبيب',
        badgeCancel: 'إلغاء',
        badgeReschedule: 'تأجيل',
        treat: 'معالجة',
        noRequests: 'لا توجد طلبات',

        recentTitle: 'آخر النشاط',
        recentSubtitle: 'إشعارات النظام الأخيرة.',
        noActivity: 'لا يوجد نشاط حديث.',

        docAgenda_dragHint:
            'اسحب الموعد إلى خانة أخرى: تُرسل طلب إلى السكرتارية للمصادقة.',
        docAgenda_tabDaily: 'عرض يومي',
        docAgenda_tabWeekly: 'عرض أسبوعي',
        docAgenda_tabWaiting: 'غرفة الانتظار',
        docAgenda_title: 'الأجندة',
        docAgenda_planningDay: 'تخطيط يوم',
        docAgenda_daySubtitle: 'مواعيدك لهذا اليوم',
        docAgenda_weekTitle: 'عرض أسبوعي',
        docAgenda_weekSubtitle: 'نظرة على أسبوعك',
        docAgenda_available: 'متاح',
        docAgenda_timeCol: 'الوقت',
        docAgenda_confirmMoveTitle: 'إرسال طلب التأجيل؟',
        docAgenda_confirmMoveDesc: 'سيتم إشعار السكرتارية لمعالجة النقل إلى الوقت المختار.',
        docAgenda_confirmSend: 'إرسال الطلب',
        docAgenda_cancel: 'إلغاء',
        docAgenda_dropSuccess: 'تم إرسال الطلب إلى السكرتارية. سيُحدَّد الموعد بعد الموافقة.',
        docAgenda_dropError: 'تعذر إرسال الطلب.',
        docAgenda_sameSlot: 'نفس الموعد.',
        docAgenda_slotOccupied: 'هذا الوقت يحتوي على موعد آخر.',
        docAgenda_dragAria: 'اسحب البطاقة أو المقبض إلى فتحة أخرى لإعادة الجدولة',
        docAgenda_waitingTitle: 'غرفة الانتظار المباشرة',
        docAgenda_waitingSubtitle: 'المرضى المسجّلون في الاستقبال لهذا اليوم.',
        docAgenda_waitingLiveHint: 'تحديث تلقائي كل 3 ثوانٍ.',
        docAgenda_waitingLiveBadge: 'مباشر',
        docAgenda_waitingEmptyTitle: 'لا يوجد مرضى في غرفة الانتظار',
        docAgenda_waitingEmptyDesc:
            'عند تسجيل المريض في الاستقبال، يظهر هنا مع سبب الزيارة والوقت والمعلومات المفيدة.',
        docAgenda_waitingPatients0: 'لا مرضى',
        docAgenda_waitingPatients1: 'مريض واحد',
        docAgenda_waitingPatientsMany: '{n} مرضى',
        docAgenda_waitingStatusPresent: 'حاضر',
        docAgenda_waitingTime: 'الوقت:',
        docAgenda_waitingConsultation: 'استشارة',
        docAgenda_waitingBlood: 'فصيلة الدم:',
        docAgenda_waitingAllergies: 'الحساسية:',
        docAgenda_waitingHistory: 'السجل الطبي:',
        docAgenda_waitingNotSpecified: 'غير محدد',
        docAgenda_waitingNoneAllergies: 'لا يوجد',
        docAgenda_waitingNoneHistory: 'لا يوجد',
        docAgenda_waitingRoom: 'قاعة',
        docAgenda_loadingAgenda: 'جاري تحميل الأجندة…',
        docAgenda_loadingWaiting: 'جاري تحميل غرفة الانتظار…',
    },
};

export function t(key, lang = getProWebLang()) {
    const L = STR[lang] || STR.fr;
    return L[key] ?? STR.fr[key] ?? key;
}

export function softenNotificationText(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const letters = s.replace(/[^a-zA-ZÀ-ÿ\u0600-\u06FF]/g, '');
    if (letters.length < 10) return s;
    const up = (s.match(/[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ]/g) || []).length;
    if (up / letters.length > 0.5) {
        const lower = s.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    return s;
}

export function formatActivityTime(iso, lang = getProWebLang()) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    const locale = lang === 'ar' ? 'ar' : lang === 'en' ? 'en-GB' : 'fr-FR';

    if (diffSec < 45) {
        if (lang === 'ar') return 'الآن';
        if (lang === 'en') return 'Just now';
        return "À l'instant";
    }
    if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60);
        try {
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-m, 'minute');
        } catch {
            return lang === 'ar' ? `منذ ${m} د` : lang === 'en' ? `${m} min ago` : `Il y a ${m} min`;
        }
    }
    if (diffSec < 86400) {
        const h = Math.floor(diffSec / 3600);
        try {
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-h, 'hour');
        } catch {
            return lang === 'ar' ? `منذ ${h} س` : lang === 'en' ? `${h} h ago` : `Il y a ${h} h`;
        }
    }
    if (diffSec < 172800) {
        const days = Math.floor(diffSec / 86400);
        try {
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
        } catch {
            return lang === 'ar' ? 'أمس' : lang === 'en' ? 'Yesterday' : 'Hier';
        }
    }
    try {
        return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}
