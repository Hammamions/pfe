import { Activity, Clock, GripVertical, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import api from '../../lib/api';
import { calendarDateKeyInTz } from '../../lib/appointmentTz';
import { t } from '../../lib/proWebI18n';
import { useProWebLang } from '../../lib/useProWebLang';

const DRAG_MIME = 'application/x-hospital-rdv+json';

const formatDateFr = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
};

const addDaysToDateInput = (dateInput, daysToAdd) => {
    const [year, month, day] = dateInput.split('-').map(Number);
    const base = new Date(year, month - 1, day);
    base.setDate(base.getDate() + daysToAdd);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getWeekDateInputs = (dateInput) => {
    const [year, month, day] = dateInput.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    const dayOfWeek = current.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayInput = addDaysToDateInput(dateInput, diffToMonday);
    return Array.from({ length: 7 }, (_, idx) => addDaysToDateInput(mondayInput, idx));
};

const sanitizeMotif = (motif) => {
    if (typeof motif !== 'string') return '';
    return motif
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

function normHM(t) {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '';
    return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function slotTimeFromHourKey(hourKey) {
    return `${String(hourKey).padStart(2, '0')}:00`;
}

function parseDragPayload(e) {
    try {
        const raw = e.dataTransfer.getData(DRAG_MIME);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function DoctorAgendaPage() {
    const lang = useProWebLang();
    const L = (key) => t(key, lang);
    const skipClickRef = useRef(false);

    const [selectedDate, setSelectedDate] = useState(() => calendarDateKeyInTz(new Date()));
    const [appointments, setAppointments] = useState([]);
    const [weeklyAppointments, setWeeklyAppointments] = useState([]);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [liveWaitingRoom, setLiveWaitingRoom] = useState([]);
    const [agendaLoading, setAgendaLoading] = useState(true);
    const [waitingLoading, setWaitingLoading] = useState(true);

    const [isDragConfirmOpen, setIsDragConfirmOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState(null);
    const [banner, setBanner] = useState(null);
    const [dragSubmitting, setDragSubmitting] = useState(false);

    const refetchAgenda = useCallback(async () => {
        setAgendaLoading(true);
        try {
            const dailyRes = await api.get('/professionals/doctor-agenda', {
                params: { date: selectedDate, _t: Date.now() },
            });
            setAppointments(Array.isArray(dailyRes.data) ? dailyRes.data : []);

            const weekDates = getWeekDateInputs(selectedDate);
            const weekResponses = await Promise.all(
                weekDates.map((date) =>
                    api.get('/professionals/doctor-agenda', {
                        params: { date, _t: Date.now() },
                    }),
                ),
            );
            const mergedWeekly = weekResponses.flatMap((res) => (Array.isArray(res.data) ? res.data : []));
            setWeeklyAppointments(mergedWeekly);
        } catch (error) {
            console.error('Error fetching doctor agenda:', error);
            setAppointments([]);
            setWeeklyAppointments([]);
        } finally {
            setAgendaLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        let isMounted = true;
        const fetchWaitingRoom = async () => {
            try {
                const res = await api.get('/professionals/doctor-waiting-room', { params: { _t: Date.now() } });
                if (!isMounted) return;
                setLiveWaitingRoom(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                if (!isMounted) return;
                console.error('Error fetching doctor waiting room:', error);
            } finally {
                if (isMounted) setWaitingLoading(false);
            }
        };

        fetchWaitingRoom();
        const intervalId = setInterval(fetchWaitingRoom, 3000);
        window.addEventListener('focus', fetchWaitingRoom);
        document.addEventListener('visibilitychange', fetchWaitingRoom);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('focus', fetchWaitingRoom);
            document.removeEventListener('visibilitychange', fetchWaitingRoom);
        };
    }, []);

    useEffect(() => {
        refetchAgenda();
    }, [refetchAgenda]);

    const handleRescheduleClick = (appointment) => {
        if (skipClickRef.current) return;
        setSelectedAppointment(appointment);
        setNewDate(selectedDate);
        setNewTime(appointment.heure);
        setIsRescheduleOpen(true);
    };

    const confirmReschedule = async () => {
        if (!selectedAppointment) return;
        try {
            await api.post(`/professionals/doctor-agenda/${selectedAppointment.id}/reschedule-request`, {
                date: newDate,
                time: newTime,
            });
            await refetchAgenda();
            setIsRescheduleOpen(false);
            setSelectedAppointment(null);
            setBanner({ type: 'success', text: L('docAgenda_dropSuccess') });
        } catch (error) {
            console.error('Error sending reschedule request:', error);
            setBanner({
                type: 'error',
                text: error.response?.data?.error || L('docAgenda_dropError'),
            });
        }
    };

    const timeSlots = Array.from({ length: 11 }, (_, i) => {
        const hour = i + 8;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const workingDays = [true, true, true, true, true, true, true];
    const weekDates = getWeekDateInputs(selectedDate);
    const appointmentsByHour = appointments.reduce((acc, apt) => {
        const hour = String(apt.heure || '').split(':')[0];
        if (!hour) return acc;
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(apt);
        return acc;
    }, {});
    const weeklyAppointmentsByDayHour = weeklyAppointments.reduce((acc, apt) => {
        const day = String(apt.date || '');
        const hour = String(apt.heure || '').split(':')[0];
        if (!day || !hour) return acc;
        const key = `${day}-${hour}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(apt);
        return acc;
    }, {});

    const othersInDailySlot = (hourKey, excludeId) =>
        (appointmentsByHour[hourKey] || []).filter((a) => a.id !== excludeId);

    const othersInWeeklySlot = (dayDate, hourKey, excludeId) =>
        (weeklyAppointmentsByDayHour[`${dayDate}-${hourKey}`] || []).filter((a) => a.id !== excludeId);

    const isSameSlot = (fromDate, fromHeure, toDate, toTime) =>
        String(fromDate) === String(toDate) && normHM(fromHeure) === normHM(toTime);

    const onDragStartAppointment = (e, apt) => {
        const fromDate = apt.date || selectedDate;
        const payload = {
            id: apt.id,
            fromDate,
            fromHeure: apt.heure,
            patientName: `${apt.patient?.prenom || ''} ${apt.patient?.nom || ''}`.trim(),
        };
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragEnd = () => {
        skipClickRef.current = true;
        window.setTimeout(() => {
            skipClickRef.current = false;
        }, 350);
    };

    const proposeDrop = (e, targetDate, hourKey) => {
        e.preventDefault();
        e.stopPropagation();
        const payload = parseDragPayload(e);
        if (!payload) return;

        const targetTime = slotTimeFromHourKey(hourKey);

        if (isSameSlot(payload.fromDate, payload.fromHeure, targetDate, targetTime)) {
            setBanner({ type: 'info', text: L('docAgenda_sameSlot') });
            return;
        }

        const others =
            targetDate === selectedDate
                ? othersInDailySlot(hourKey, payload.id)
                : othersInWeeklySlot(targetDate, hourKey, payload.id);

        if (others.length > 0) {
            setBanner({ type: 'error', text: L('docAgenda_slotOccupied') });
            return;
        }

        setPendingMove({
            ...payload,
            targetDate,
            targetTime,
        });
        setIsDragConfirmOpen(true);
    };

    const confirmDragMove = async () => {
        if (!pendingMove) return;
        setDragSubmitting(true);
        try {
            await api.post(`/professionals/doctor-agenda/${pendingMove.id}/reschedule-request`, {
                date: pendingMove.targetDate,
                time: pendingMove.targetTime,
            });
            await refetchAgenda();
            setIsDragConfirmOpen(false);
            setPendingMove(null);
            setBanner({ type: 'success', text: L('docAgenda_dropSuccess') });
        } catch (error) {
            console.error(error);
            setBanner({
                type: 'error',
                text: error.response?.data?.error || L('docAgenda_dropError'),
            });
        } finally {
            setDragSubmitting(false);
        }
    };

    const aptCardClass =
        'group flex touch-none cursor-grab select-none items-center justify-between gap-3 rounded-xl border border-indigo-100/80 bg-gradient-to-br from-white to-indigo-50/40 p-3 shadow-sm ring-1 ring-indigo-100/50 transition hover:border-indigo-200/90 hover:shadow-md active:cursor-grabbing';

    const waitingCountLabel = waitingLoading
        ? '…'
        : liveWaitingRoom.length === 0
          ? L('docAgenda_waitingPatients0')
          : liveWaitingRoom.length === 1
            ? L('docAgenda_waitingPatients1')
            : L('docAgenda_waitingPatientsMany').replace('{n}', String(liveWaitingRoom.length));

    return (
        <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {banner && (
                <div
                    role="status"
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                        banner.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : banner.type === 'error'
                              ? 'border-rose-200 bg-rose-50 text-rose-900'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-900'
                    }`}
                >
                    {banner.text}
                    <button
                        type="button"
                        className="ms-3 text-xs font-bold underline opacity-80 hover:opacity-100"
                        onClick={() => setBanner(null)}
                    >
                        OK
                    </button>
                </div>
            )}

            <p className="rounded-xl border border-indigo-100/80 bg-white/80 px-4 py-3 text-sm text-indigo-900/80 shadow-sm">
                {L('docAgenda_dragHint')}
            </p>

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-indigo-950">{L('docAgenda_title')}</h1>
            </div>

            <Tabs defaultValue="daily" className="w-full">
                <TabsList className="bg-indigo-50/60">
                    <TabsTrigger value="daily">{L('docAgenda_tabDaily')}</TabsTrigger>
                    <TabsTrigger value="weekly">{L('docAgenda_tabWeekly')}</TabsTrigger>
                    <TabsTrigger value="waiting">{L('docAgenda_tabWaiting')}</TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="mt-6 space-y-4">
                    <Card className="border-indigo-100/70 shadow-md shadow-indigo-500/5">
                        <CardHeader>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle className="text-indigo-950">
                                        {L('docAgenda_planningDay')} {formatDateFr(selectedDate)}
                                    </CardTitle>
                                    <CardDescription>{L('docAgenda_daySubtitle')}</CardDescription>
                                </div>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="rounded-xl border border-indigo-200/80 bg-white px-3 py-2 text-sm shadow-sm"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {agendaLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-indigo-900/50">
                                    <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    <p className="text-sm">{L('docAgenda_loadingAgenda')}</p>
                                </div>
                            ) : (
                            <div className="space-y-2">
                                {timeSlots.map((time) => {
                                    const hourKey = time.split(':')[0];
                                    const hourAppointments = appointmentsByHour[hourKey] || [];
                                    return (
                                        <div
                                            key={time}
                                            role="presentation"
                                            className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-3 transition hover:border-indigo-200/60"
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                            }}
                                            onDrop={(e) => proposeDrop(e, selectedDate, hourKey)}
                                        >
                                            <div className="w-20 shrink-0 pt-2 text-sm font-semibold text-indigo-900/70">
                                                {time}
                                            </div>
                                            {hourAppointments.length > 0 ? (
                                                <div
                                                    className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2"
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => proposeDrop(e, selectedDate, hourKey)}
                                                >
                                                    {hourAppointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            draggable
                                                            title={L('docAgenda_dragAria')}
                                                            onDragStart={(e) => {
                                                                e.stopPropagation();
                                                                onDragStartAppointment(e, appointment);
                                                            }}
                                                            onDragEnd={(e) => {
                                                                e.stopPropagation();
                                                                onDragEnd();
                                                            }}
                                                            onClick={() => handleRescheduleClick(appointment)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ')
                                                                    handleRescheduleClick(appointment);
                                                            }}
                                                            className={aptCardClass}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <div
                                                                    className="flex min-h-[3rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-xl border border-indigo-100/70 bg-indigo-50/60 text-indigo-500 shadow-inner transition group-hover:border-indigo-200 group-hover:bg-indigo-100/70"
                                                                    aria-hidden
                                                                >
                                                                    <GripVertical className="h-5 w-5" strokeWidth={2} />
                                                                </div>
                                                                <div
                                                                    className={`h-10 w-1 shrink-0 rounded-full ${
                                                                        appointment.rescheduleStatus === 'pending'
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-indigo-500'
                                                                    }`}
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h4 className="truncate font-semibold text-indigo-950">
                                                                            {appointment.patient.prenom}{' '}
                                                                            {appointment.patient.nom}
                                                                        </h4>
                                                                        {appointment.rescheduleStatus === 'pending' && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-amber-200 bg-amber-50 text-xs text-amber-800"
                                                                            >
                                                                                Report demandé
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="truncate text-sm text-slate-600">
                                                                        {sanitizeMotif(appointment.motif) || L('docAgenda_waitingConsultation')}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                                        Salle {appointment.salle}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="shrink-0 capitalize">
                                                                {appointment.statut}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div
                                                    className="min-h-[3rem] flex-1 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 px-3 py-4 text-sm text-slate-400 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => proposeDrop(e, selectedDate, hourKey)}
                                                >
                                                    {L('docAgenda_available')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="weekly" className="mt-6">
                    <Card className="border-indigo-100/70 shadow-md shadow-indigo-500/5">
                        <CardHeader>
                            <CardTitle className="text-indigo-950">{L('docAgenda_weekTitle')}</CardTitle>
                            <CardDescription>{L('docAgenda_weekSubtitle')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {agendaLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-indigo-900/50">
                                    <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    <p className="text-sm">{L('docAgenda_loadingAgenda')}</p>
                                </div>
                            ) : (
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px]">
                                    <div className="mb-2 grid grid-cols-8 gap-2">
                                        <div className="text-sm font-semibold text-indigo-900/60">
                                            {L('docAgenda_timeCol')}
                                        </div>
                                        {daysOfWeek.map((day, di) => (
                                            <div
                                                key={day}
                                                className="text-center text-sm font-semibold text-indigo-950"
                                            >
                                                <div>{day}</div>
                                                <div className="text-[10px] font-normal text-slate-500">
                                                    {formatDateFr(weekDates[di])}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {timeSlots.map((time) => (
                                        <div key={time} className="mb-1 grid grid-cols-8 gap-2">
                                            <div className="py-2 text-sm text-indigo-900/70">{time}</div>
                                            {daysOfWeek.map((day, idx) => {
                                                const dayDate = weekDates[idx];
                                                const hourKey = time.split(':')[0];
                                                const slotAppointments =
                                                    weeklyAppointmentsByDayHour[`${dayDate}-${hourKey}`] || [];
                                                const hasAppointment = slotAppointments.length > 0;
                                                const canDropHere = workingDays[idx];
                                                return (
                                                    <div
                                                        key={`${day}-${time}`}
                                                        className={`min-h-[3.25rem] rounded-xl border p-2 text-xs transition ${
                                                            hasAppointment
                                                                ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50/50'
                                                                : canDropHere
                                                                  ? 'border-slate-200/80 bg-slate-50/50 hover:border-indigo-200'
                                                                  : 'cursor-not-allowed border-slate-100 bg-slate-100/80 opacity-60'
                                                        }`}
                                                        onDragOver={
                                                            canDropHere
                                                                ? (e) => {
                                                                      e.preventDefault();
                                                                      e.dataTransfer.dropEffect = 'move';
                                                                  }
                                                                : undefined
                                                        }
                                                        onDrop={
                                                            canDropHere
                                                                ? (e) => proposeDrop(e, dayDate, hourKey)
                                                                : undefined
                                                        }
                                                    >
                                                        {hasAppointment && (
                                                            <div
                                                                draggable
                                                                title={L('docAgenda_dragAria')}
                                                                onDragStart={(e) => {
                                                                    e.stopPropagation();
                                                                    onDragStartAppointment(e, slotAppointments[0]);
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    e.stopPropagation();
                                                                    onDragEnd();
                                                                }}
                                                                className="touch-none cursor-grab space-y-1 rounded-lg py-0.5 active:cursor-grabbing"
                                                            >
                                                                <div className="flex items-start gap-1.5">
                                                                    <div
                                                                        className="mt-0.5 flex min-h-[2.25rem] min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg border border-indigo-100/80 bg-white/70 text-indigo-500 shadow-sm"
                                                                        aria-hidden
                                                                    >
                                                                        <GripVertical className="h-4 w-4" strokeWidth={2} />
                                                                    </div>
                                                                    <div className="min-w-0 font-medium text-indigo-950">
                                                                        <span className="block truncate">
                                                                            {slotAppointments[0]?.patient?.prenom}{' '}
                                                                            {slotAppointments[0]?.patient?.nom}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {slotAppointments.length > 1 && (
                                                                    <div className="text-[10px] text-indigo-700">
                                                                        +{slotAppointments.length - 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {!hasAppointment && canDropHere && (
                                                            <div className="flex h-full min-h-[2.5rem] items-center justify-center text-[10px] text-slate-400">
                                                                {L('docAgenda_available')}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="waiting" className="mt-6">
                    <Card className="overflow-hidden border-indigo-100/70 shadow-md shadow-indigo-500/5">
                        <CardHeader className="border-b border-indigo-100/70 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/35 pb-6 pt-6">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                                        <Users className="h-6 w-6" aria-hidden />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CardTitle className="text-xl tracking-tight text-indigo-950">
                                                {L('docAgenda_waitingTitle')}
                                            </CardTitle>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                                <span className="relative flex h-2 w-2 shrink-0">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                </span>
                                                {L('docAgenda_waitingLiveBadge')}
                                            </span>
                                        </div>
                                        <CardDescription className="max-w-xl text-base text-indigo-900/70">
                                            {L('docAgenda_waitingSubtitle')}
                                        </CardDescription>
                                        <p className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                                            <Activity className="h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden />
                                            {L('docAgenda_waitingLiveHint')}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="h-fit w-fit shrink-0 border border-indigo-200/80 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-950 shadow-sm"
                                >
                                    {waitingCountLabel}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="bg-gradient-to-b from-slate-50/80 to-white p-4 sm:p-6">
                            {waitingLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-indigo-900/50">
                                    <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    <p className="text-sm">{L('docAgenda_loadingWaiting')}</p>
                                </div>
                            ) : liveWaitingRoom.length > 0 ? (
                                <ul className="m-0 list-none space-y-4 p-0">
                                    {liveWaitingRoom.map((patient) => (
                                        <li key={patient.id}>
                                            <div className="group relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/50 p-4 shadow-sm ring-1 ring-indigo-100/40 transition hover:border-indigo-300/60 hover:shadow-md">
                                                <div
                                                    className="absolute start-0 top-0 h-full w-1 rounded-full bg-indigo-500"
                                                    aria-hidden
                                                />
                                                <div className="ps-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                                <h4 className="text-lg font-semibold tracking-tight text-indigo-950">
                                                                    {patient.patientName}
                                                                </h4>
                                                                <Badge
                                                                    variant="default"
                                                                    className="bg-emerald-600 text-xs font-medium hover:bg-emerald-600"
                                                                >
                                                                    {L('docAgenda_waitingStatusPresent')}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm leading-relaxed text-slate-600">
                                                                {sanitizeMotif(patient.motif) || L('docAgenda_waitingConsultation')}
                                                            </p>
                                                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                                                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50/80 px-2 py-1 font-medium text-indigo-900/80">
                                                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                                                    {L('docAgenda_waitingTime')} {patient.heure}
                                                                </span>
                                                                <span className="text-slate-300">•</span>
                                                                <span>
                                                                    {patient.lieu} • {L('docAgenda_waitingRoom')}{' '}
                                                                    {patient.salle}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 grid gap-2 rounded-xl border border-slate-200/90 bg-white/90 p-3 text-xs text-slate-700 shadow-inner shadow-slate-100/80 sm:grid-cols-1">
                                                        <p>
                                                            <span className="font-semibold text-indigo-950">
                                                                {L('docAgenda_waitingBlood')}
                                                            </span>{' '}
                                                            {patient.dossierMedical?.bloodGroup ||
                                                                L('docAgenda_waitingNotSpecified')}
                                                        </p>
                                                        <p>
                                                            <span className="font-semibold text-indigo-950">
                                                                {L('docAgenda_waitingAllergies')}
                                                            </span>{' '}
                                                            {(patient.dossierMedical?.allergies || []).join(', ') ||
                                                                L('docAgenda_waitingNoneAllergies')}
                                                        </p>
                                                        <p>
                                                            <span className="font-semibold text-indigo-950">
                                                                {L('docAgenda_waitingHistory')}
                                                            </span>{' '}
                                                            {(patient.dossierMedical?.history || [])
                                                                .slice(0, 3)
                                                                .join(', ') || L('docAgenda_waitingNoneHistory')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200/80 bg-gradient-to-b from-white via-indigo-50/20 to-violet-50/25 px-6 py-16 text-center shadow-inner">
                                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 ring-4 ring-indigo-50">
                                        <Users className="h-10 w-10 text-indigo-400" strokeWidth={1.25} aria-hidden />
                                    </div>
                                    <h3 className="text-lg font-semibold text-indigo-950">
                                        {L('docAgenda_waitingEmptyTitle')}
                                    </h3>
                                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                                        {L('docAgenda_waitingEmptyDesc')}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isDragConfirmOpen} onOpenChange={setIsDragConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{L('docAgenda_confirmMoveTitle')}</DialogTitle>
                        <DialogDescription>{L('docAgenda_confirmMoveDesc')}</DialogDescription>
                    </DialogHeader>
                    {pendingMove && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 text-sm text-indigo-950">
                            <p className="font-semibold">{pendingMove.patientName}</p>
                            <p className="mt-2 text-xs text-slate-600">
                                <span className="font-medium">{formatDateFr(pendingMove.fromDate)}</span>{' '}
                                {normHM(pendingMove.fromHeure)} →{' '}
                                <span className="font-medium">{formatDateFr(pendingMove.targetDate)}</span>{' '}
                                {normHM(pendingMove.targetTime)}
                            </p>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                                setIsDragConfirmOpen(false);
                                setPendingMove(null);
                            }}
                            disabled={dragSubmitting}
                        >
                            {L('docAgenda_cancel')}
                        </Button>
                        <Button type="button" onClick={confirmDragMove} disabled={dragSubmitting}>
                            {dragSubmitting ? '…' : L('docAgenda_confirmSend')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reprogrammer le rendez-vous</DialogTitle>
                        <DialogDescription>
                            Proposer un nouvel horaire pour {selectedAppointment?.patient?.prenom}{' '}
                            {selectedAppointment?.patient?.nom}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">
                                Heure
                            </Label>
                            <Input
                                id="time"
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={confirmReschedule}>Confirmer la demande</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
