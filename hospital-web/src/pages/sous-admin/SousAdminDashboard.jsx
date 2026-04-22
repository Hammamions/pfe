import {
    Activity,
    ArrowUpRight,
    CalendarClock,
    CalendarDays,
    CalendarSync,
    ClipboardList,
    Inbox,
    ListTodo,
    Sparkles,
    Stethoscope,
    UserPlus,
    Users,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import api from '../../lib/api';
import { calendarDateKeyInTz } from '../../lib/appointmentTz';
import {
    formatActivityTime,
    softenNotificationText,
    t,
} from '../../lib/proWebI18n';
import { useProWebLang } from '../../lib/useProWebLang';

const sanitizeMotif = (motif) => {
    if (typeof motif !== 'string') return '';
    return motif
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export default function SousAdminDashboard() {
    const lang = useProWebLang();
    const REFRESH_INTERVAL_MS = 3000;
    const SLOTS_PER_DOCTOR = 20;
    const sessionUser = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('proUser') || '{}');
        } catch {
            return {};
        }
    })();
    const serviceLabel = sessionUser.specialite || 'Cardiologie';

    const [stats, setStats] = useState({
        pendingCount: 0,
        availableSlotsCount: 0,
        occupiedCount: 0,
        totalTodayCount: 0
    });
    const [recentRequests, setRecentRequests] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let intervalId = null;

        const fetchDashboardData = async () => {
            try {
                const ts = Date.now();
                const todayIso = calendarDateKeyInTz(new Date());
                const [statsRes, activitiesRes, aptsRes, doctorsRes, pendingRes, drConsultRes] = await Promise.allSettled([
                    api.get('/sous-admin/stats', { params: { _t: ts } }),
                    api.get('/sous-admin/activities', { params: { _t: ts } }),
                    api.get('/professionals/all-appointments', { params: { _t: ts, status: 'live' } }),
                    api.get('/sous-admin/doctors', { params: { _t: ts, date: todayIso } }),
                    api.get('/sous-admin/appointments/pending', { params: { _t: ts } }),
                    api.get('/sous-admin/doctor-consultation-requests', { params: { _t: ts } })
                ]);

                if (!isMounted) return;

                if (statsRes.status === 'rejected') console.warn('Dashboard: stats indisponibles', statsRes.reason);
                if (activitiesRes.status === 'rejected') console.warn('Dashboard: activities indisponibles', activitiesRes.reason);
                if (aptsRes.status === 'rejected') console.warn('Dashboard: rendez-vous indisponibles', aptsRes.reason);
                if (doctorsRes.status === 'rejected') console.warn('Dashboard: médecins indisponibles', doctorsRes.reason);
                if (pendingRes.status === 'rejected') console.warn('Dashboard: demandes en attente indisponibles', pendingRes.reason);
                if (drConsultRes.status === 'rejected') console.warn('Dashboard: demandes médecin indisponibles', drConsultRes.reason);

                const aptsData =
                    aptsRes.status === 'fulfilled' && Array.isArray(aptsRes.value.data) ? aptsRes.value.data : [];

                const pendingRows =
                    pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value.data) ? pendingRes.value.data : [];
                const drConsultRows =
                    drConsultRes.status === 'fulfilled' && Array.isArray(drConsultRes.value.data)
                        ? drConsultRes.value.data
                        : [];

                const annulOrReport = aptsData.filter(
                    (a) => a.requestType === 'ANNULATION' || a.requestType === 'REPORT'
                );
                const todayStr = calendarDateKeyInTz(new Date());
                const confirmedTodayAppointments = aptsData.filter(
                    (a) => a.date === todayStr && a.status === 'CONFIRME'
                );
                const doctors =
                    doctorsRes.status === 'fulfilled' && Array.isArray(doctorsRes.value.data)
                        ? doctorsRes.value.data
                        : [];
                const totalTodaySlots = doctors.length * SLOTS_PER_DOCTOR;
                const availableSlotsCount = Math.max(0, totalTodaySlots - confirmedTodayAppointments.length);
                setStats({
                    pendingCount: pendingRows.length + annulOrReport.length + drConsultRows.length,
                    availableSlotsCount,
                    occupiedCount: confirmedTodayAppointments.length,
                    totalTodayCount: totalTodaySlots
                });

                setActivities(
                    activitiesRes.status === 'fulfilled' && Array.isArray(activitiesRes.value.data)
                        ? activitiesRes.value.data
                        : []
                );

                const parseSortTime = (dateStr, timeStr) => {
                    if (!dateStr) return 0;
                    const t = (timeStr && String(timeStr).trim()) || '12:00';
                    const iso = `${dateStr}T${t.length <= 5 ? `${t}:00` : t}`;
                    const ms = Date.parse(iso);
                    return Number.isNaN(ms) ? 0 : ms;
                };

                const mergedRecent = [
                    ...pendingRows.map((p) => ({
                        id: p.id,
                        patientName: p.patientName,
                        motif: sanitizeMotif(p.motifDisplay || p.motif),
                        requestType: null,
                        sortTime: new Date(p.requestedAt).getTime()
                    })),
                    ...annulOrReport.map((a) => ({
                        id: a.id,
                        patientName: a.patientName,
                        motif: sanitizeMotif(a.motif),
                        requestType: a.requestType,
                        sortTime: parseSortTime(a.date, a.time)
                    })),
                    ...drConsultRows.map((d) => ({
                        id: d.id,
                        patientName: d.patientName,
                        motif: sanitizeMotif(d.motifDisplay || d.motif),
                        requestType: 'CONSULTATION_DR',
                        sortTime: new Date(d.createdAt).getTime()
                    }))
                ]
                    .sort((x, y) => y.sortTime - x.sortTime)
                    .slice(0, 8);

                setRecentRequests(mergedRecent);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDashboardData();
        intervalId = setInterval(fetchDashboardData, REFRESH_INTERVAL_MS);
        window.addEventListener('focus', fetchDashboardData);
        document.addEventListener('visibilitychange', fetchDashboardData);

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('focus', fetchDashboardData);
            document.removeEventListener('visibilitychange', fetchDashboardData);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
                <p className="text-sm font-medium text-slate-600">Chargement du tableau de bord…</p>
            </div>
        );
    }

    const initialFor = (name) => {
        const s = String(name || '').trim();
        return s ? s[0].toUpperCase() : '?';
    };

    const L = (key) => t(key, lang);

    const todayLabel = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-TN' : 'fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    const requestAccent = (req) => {
        if (!req.requestType) return 'border-s-indigo-500';
        if (req.requestType === 'CONSULTATION_DR') return 'border-s-violet-500';
        if (req.requestType === 'ANNULATION') return 'border-s-rose-500';
        return 'border-s-amber-500';
    };

    const requestVisual = (req) => {
        if (!req.requestType) {
            return {
                Icon: UserPlus,
                wrap: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-700/30 ring-2 ring-indigo-100',
            };
        }
        if (req.requestType === 'CONSULTATION_DR') {
            return {
                Icon: Stethoscope,
                wrap: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-600/25 ring-2 ring-violet-100',
            };
        }
        if (req.requestType === 'ANNULATION') {
            return {
                Icon: XCircle,
                wrap: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-100',
            };
        }
        return {
            Icon: CalendarSync,
            wrap: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-600/20 ring-2 ring-amber-100',
        };
    };

    const activityDotClass = (i) => {
        const palette = [
            'bg-indigo-500 shadow-[0_0_0_4px_rgba(255,255,255,1)] ring-1 ring-indigo-200',
            'bg-sky-500 shadow-[0_0_0_4px_rgba(255,255,255,1)] ring-1 ring-sky-200',
            'bg-violet-500 shadow-[0_0_0_4px_rgba(255,255,255,1)] ring-1 ring-violet-200',
        ];
        return palette[i % palette.length];
    };

    return (
        <div
            className="mx-auto max-w-[1220px] space-y-7 pb-20"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/40 p-5 shadow-sm sm:p-6">
                <div
                    className="pointer-events-none absolute -end-20 -top-20 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-16 -start-12 h-48 w-48 rounded-full bg-slate-400/10 blur-3xl"
                    aria-hidden
                />
                <header className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2.5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                            {L('dashboardEyebrow')}
                        </div>
                        <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            {L('pilotagePrefix')}{' '}
                            <span className="bg-gradient-to-r from-indigo-800 to-indigo-500 bg-clip-text text-transparent">
                                {serviceLabel}
                            </span>
                        </h1>
                        <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {L('dashboardStrategic')}
                        </p>
                        <div
                            className="flex flex-wrap items-center gap-2 pt-1"
                            aria-hidden
                        >
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                                <Inbox className="h-3.5 w-3.5 text-rose-600" />
                                {L('heroIconRdv')}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-900">
                                <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
                                {L('heroIconSlots')}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/80">
                                <CalendarDays className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="text-xs font-medium capitalize leading-snug text-slate-700 sm:text-sm">
                                {todayLabel}
                            </span>
                        </div>
                        <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
                        <span className="rounded-lg bg-indigo-600/10 px-2.5 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
                            {serviceLabel}
                        </span>
                    </div>
                </header>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
                <div className="group relative flex min-h-[150px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 lg:col-span-6">
                    <div
                        className="pointer-events-none absolute inset-y-0 start-0 w-1 rounded-s-3xl bg-rose-400"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -end-8 -top-8 h-32 w-32 rounded-full bg-rose-400/8 blur-2xl"
                        aria-hidden
                    />
                    <div className="relative flex items-start justify-between gap-3 ps-1">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-600 ring-2 ring-rose-100/80 shadow-inner">
                            <Inbox className="h-5.5 w-5.5" strokeWidth={2} aria-hidden />
                        </div>
                        <span className="rounded-full border border-rose-100 bg-rose-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-800">
                            {L('kpiAction')}
                        </span>
                    </div>
                    <div className="relative mt-auto pt-4 ps-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {L('kpiPendingTitle')}
                        </p>
                        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[2.75rem]">
                            {stats.pendingCount}
                        </p>
                    </div>
                </div>

                <div className="relative flex min-h-[150px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 lg:col-span-6">
                    <div
                        className="pointer-events-none absolute inset-y-0 start-0 w-1 rounded-s-3xl bg-sky-500"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -end-6 top-0 h-24 w-24 rounded-full bg-sky-400/15 blur-2xl"
                        aria-hidden
                    />
                    <div className="flex items-start justify-between gap-3 ps-1">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-800 ring-2 ring-sky-100/90 shadow-inner">
                            <Users className="h-5.5 w-5.5" strokeWidth={2} aria-hidden />
                        </div>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-900">
                            {L('kpiDispo')}
                        </span>
                    </div>
                    <div className="mt-auto pt-4 ps-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {L('kpiSlotsTitle')}
                        </p>
                        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[2.75rem]">
                            {stats.availableSlotsCount}
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-950 ring-1 ring-indigo-100">
                                <CalendarClock className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                                {L('kpiConfirmed')}{' '}
                                <span className="tabular-nums font-semibold text-indigo-800">{stats.occupiedCount}</span> /{' '}
                                <span className="tabular-nums text-indigo-900/90">{stats.totalTodayCount}</span>
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-7 xl:col-span-8">
                    <Card className="overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-sm">
                        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700 ring-2 ring-orange-100/80 shadow-sm">
                                    <ClipboardList className="h-6 w-6" strokeWidth={2} aria-hidden />
                                </span>
                                <div className="min-w-0 space-y-1">
                                    <CardTitle className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                                        {L('latestTitle')}
                                    </CardTitle>
                                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{L('latestSubtitle')}</p>
                                </div>
                            </div>
                            <Link
                                to="/sous-admin/appointments"
                                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-sm transition hover:border-indigo-300 hover:from-indigo-100/90 hover:to-sky-50 sm:self-auto"
                            >
                                <CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden />
                                {L('manageAll')}
                                <ArrowUpRight className={`h-4 w-4 text-indigo-700 ${lang === 'ar' ? '-scale-x-100' : ''}`} />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            {recentRequests.length > 0 ? (
                                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/30">
                                    {recentRequests.map((req) => {
                                        const { Icon: ReqIcon, wrap: reqIconWrap } = requestVisual(req);
                                        return (
                                        <li
                                            key={req.id}
                                            className={`flex flex-col gap-4 border-s-4 bg-white p-4 transition first:rounded-t-2xl last:rounded-b-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 ${requestAccent(req)}`}
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="relative shrink-0" aria-hidden>
                                                    <div
                                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${reqIconWrap}`}
                                                    >
                                                        <ReqIcon className="h-5 w-5" strokeWidth={2.25} />
                                                    </div>
                                                    <span className="absolute -bottom-0.5 -end-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-bold text-slate-700 shadow-sm">
                                                        {initialFor(req.patientName)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="truncate text-base font-semibold text-slate-900">
                                                        {req.patientName}
                                                    </h4>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                        <span className="line-clamp-1 text-xs text-slate-500">
                                                            {sanitizeMotif(req.motif) || '—'}
                                                        </span>
                                                        {!req.requestType && (
                                                            <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900 ring-1 ring-indigo-100">
                                                                {L('badgeNew')}
                                                            </span>
                                                        )}
                                                        {req.requestType === 'CONSULTATION_DR' && (
                                                            <span className="inline-flex rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 ring-1 ring-violet-100">
                                                                {L('badgeDoctor')}
                                                            </span>
                                                        )}
                                                        {req.requestType && req.requestType !== 'CONSULTATION_DR' && (
                                                            <span
                                                                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                                                                    req.requestType === 'ANNULATION'
                                                                        ? 'bg-rose-50 text-rose-800 ring-rose-100'
                                                                        : 'bg-amber-50 text-amber-900 ring-amber-100'
                                                                }`}
                                                            >
                                                                {req.requestType === 'ANNULATION'
                                                                    ? L('badgeCancel')
                                                                    : L('badgeReschedule')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link to="/sous-admin/appointments" className="shrink-0 sm:self-center">
                                                <Button
                                                    size="sm"
                                                    className="h-10 w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 px-6 text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-indigo-950/35 hover:from-indigo-600 hover:via-indigo-700 hover:to-slate-900 sm:w-auto"
                                                >
                                                    <ListTodo className="h-4 w-4 text-sky-200" aria-hidden />
                                                    {L('treat')}
                                                </Button>
                                            </Link>
                                        </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
                                    <Inbox className="mb-3 h-11 w-11 text-slate-300" strokeWidth={1.25} aria-hidden />
                                    <p className="text-sm font-semibold text-slate-800">{L('noRequests')}</p>
                                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                                        Les nouvelles demandes apparaîtront ici dès qu’un patient ou un médecin agit sur
                                        le flux.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-5 xl:col-span-4">
                    <Card className="h-full overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/40 p-6 sm:p-8">
                            <div className="flex items-start gap-3">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-900/30 ring-2 ring-indigo-100">
                                    <Activity className="h-5 w-5" strokeWidth={2} aria-hidden />
                                </span>
                                <div className="min-w-0 space-y-1">
                                    <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                                        {L('recentTitle')}
                                    </h2>
                                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                                        {L('recentSubtitle')}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-7">
                            {activities.length === 0 ? (
                                <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                                    <Activity
                                        className="mb-3 h-10 w-10 text-slate-300"
                                        strokeWidth={1.25}
                                        aria-hidden
                                    />
                                    <p className="text-sm font-medium text-slate-600">{L('noActivity')}</p>
                                </div>
                            ) : (
                                <ul className="relative space-y-0 before:absolute before:inset-y-1 before:w-px before:bg-slate-200 sm:before:start-3.5">
                                    {activities.map((act, i) => (
                                        <li
                                            key={act.id ?? i}
                                            className="relative flex gap-4 pb-8 ps-0 last:pb-0 sm:ps-8"
                                        >
                                            <span
                                                className={`absolute start-2.5 top-1.5 hidden h-2.5 w-2.5 rounded-full sm:flex ${activityDotClass(i)}`}
                                                aria-hidden
                                            />
                                            <div className="min-w-0 flex-1 pt-0.5">
                                                <p className="text-[13px] font-medium leading-snug text-slate-700 [text-wrap:pretty]">
                                                    {softenNotificationText(act.action)}
                                                </p>
                                                <p className="mt-2 text-[11px] font-medium tabular-nums text-slate-500">
                                                    {act.createdAt
                                                        ? formatActivityTime(act.createdAt, lang)
                                                        : act.time}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
