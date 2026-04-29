import {
    Activity,
    AlertTriangle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Inbox,
    Search,
    Users,
    X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import api from '../../lib/api';
import { APPOINTMENT_DISPLAY_TZ, calendarDateKeyInTz, utcInstantFromWallClock } from '../../lib/appointmentTz';
import { useProWebLang } from '../../lib/useProWebLang';

const SEAT_MAP_STYLES = `
  @keyframes pulse-red {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
  }
  .animate-pulse-red { animation: pulse-red 2s infinite; }
  .glass-seat { backdrop-filter: blur(8px); background-opacity: 0.8; }
`;

const HOURS = Array.from({ length: 11 }, (_, i) => (i + 8).toString().padStart(2, '0'));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const AVAILABLE_LOCATIONS = [
    'Batiment Principal',
    'Batiment A',
    'Batiment B',
    'Batiment C'
];
const ROOMS_BY_LOCATION = {
    'Batiment Principal': ['A-101', 'A-102', 'A-103', 'A-203'],
    'Batiment A': ['A1-01', 'A1-02', 'A2-10', 'A3-12'],
    'Batiment B': ['B-101', 'B-201', 'B-202', 'B-305'],
    'Batiment C': ['C-01', 'C-02', 'C-10', 'C-12']
};

const sanitizeMotif = (motif) => {
    if (typeof motif !== 'string') return '';
    return motif
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const generateNextDates = () => {
    const dates = [];
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        dates.push({
            fullDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
            dayNum: d.getDate(),
            month: d.toLocaleDateString('fr-FR', { month: 'short' })
        });
    }
    return dates;
};

const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

function doctorSchedulingScore(d, availabilityLabel) {
    const workload = typeof d.workload === 'number' ? d.workload : 0;
    let tier = 4;
    if (availabilityLabel === 'Disponible') tier = 0;
    else if (availabilityLabel === 'Chargé') tier = 1;
    else if (availabilityLabel === 'Complet') tier = 2;
    else if (availabilityLabel === 'En congé') tier = 99;
    return tier * 1000 + workload;
}

export default function SousAdminAppointments() {
    const lang = useProWebLang();
    return (
        <>
            <style>{SEAT_MAP_STYLES}</style>
            <SousAdminAppointmentsContent lang={lang} />
        </>
    );
}

function SousAdminAppointmentsContent({ lang }) {
    const REFRESH_INTERVAL_MS = 12000;
    const [planningRequestId, setPlanningRequestId] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [doctorConsultRequests, setDoctorConsultRequests] = useState([]);
    const [waitingRoom, setWaitingRoom] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState(null);
    const fetchInFlight = useRef(false);
    const initialPageLoad = useRef(true);

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedMinute, setSelectedMinute] = useState(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [doctorSearch, setDoctorSearch] = useState('');
    const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Batiment Principal');
    const [selectedRoom, setSelectedRoom] = useState('A-102');
    const [planificationError, setPlanificationError] = useState('');

    const [currentStep, setCurrentStep] = useState(1);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [draggedPatient, setDraggedPatient] = useState(null);
    const [demoPatients, setDemoPatients] = useState([
        { id: 'demo-1', patientName: 'Ahmed Aamri', time: '09:00', doctor: 'Dr. Hadj', status: 'CONFIRME', presenceStatus: null, isUrgent: false },
        { id: 'demo-2', patientName: 'Ghada Bagane', time: '09:30', doctor: 'Dr. Messaoud', status: 'CONFIRME', presenceStatus: null, isUrgent: true },
        { id: 'demo-3', patientName: 'Karim Belhadj', time: '10:00', doctor: 'Dr. Hadj', status: 'EN_COURS', presenceStatus: 'PRESENT', isUrgent: false },
    ]);

    const availableDates = useMemo(() => generateNextDates(), []);
    const selectedTime = selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : null;
    const availableRooms = ROOMS_BY_LOCATION[selectedLocation] || [];

    const days = useMemo(() => getDaysInMonth(calendarYear, calendarMonth), [calendarYear, calendarMonth]);

    const prevMonth = () => {
        if (calendarMonth === 0) {
            setCalendarYear(calendarYear - 1);
            setCalendarMonth(11);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const nextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarYear(calendarYear + 1);
            setCalendarMonth(0);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let intervalId = null;

        const fetchData = async () => {
            if (fetchInFlight.current) return;
            fetchInFlight.current = true;
            try {
                const ts = Date.now();
                if (isMounted && initialPageLoad.current) setLoading(true);
                const [aptsRes, docsRes, wrRes, drRes] = await Promise.allSettled([
                    api.get('/professionals/all-appointments', { params: { _t: ts, status: 'live' } }),
                    api.get('/professionals/doctors', {
                        params: { _t: ts, status: 'live', date: selectedDate }
                    }),
                    api.get('/sous-admin/waiting-room', { params: { _t: ts } }),
                    api.get('/sous-admin/doctor-consultation-requests', { params: { _t: ts } })
                ]);
                if (!isMounted) return;

                if (aptsRes.status === 'fulfilled') {
                    setAppointments(Array.isArray(aptsRes.value.data) ? aptsRes.value.data : []);
                } else {
                    console.error("Appointments live refresh error:", aptsRes.reason);
                }

                if (docsRes.status === 'fulfilled') {
                    setDoctors(Array.isArray(docsRes.value.data) ? docsRes.value.data : []);
                } else {
                    console.error("Doctors refresh error:", docsRes.reason);
                }

                if (wrRes.status === 'fulfilled') {
                    setWaitingRoom(Array.isArray(wrRes.value.data) ? wrRes.value.data : []);
                } else {
                    console.error("Waiting room refresh error:", wrRes.reason);
                }

                if (drRes.status === 'fulfilled') {
                    setDoctorConsultRequests(Array.isArray(drRes.value.data) ? drRes.value.data : []);
                } else {
                    console.warn('Demandes médecin indisponibles', drRes.reason);
                }
            } catch (err) {
                console.error("Fetch data error:", err);
            } finally {
                fetchInFlight.current = false;
                if (isMounted && initialPageLoad.current) {
                    setLoading(false);
                    initialPageLoad.current = false;
                }
            }
        };

        fetchData();
        intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS);
        const onFocus = () => fetchData();
        const onVis = () => {
            if (document.visibilityState === 'visible') fetchData();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVis);

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [selectedDate]);

    const sortedRequests = useMemo(() => {
        const safeApts = Array.isArray(appointments) ? appointments.filter(Boolean) : [];
        const fromApts = safeApts.filter((a) =>
            a.status === 'EN_ATTENTE' || a.requestType === 'ANNULATION' || a.requestType === 'REPORT'
        );

        const sortKeyFromApt = (a) => {
            if (!a) return 0;
            try {
                const [hh, mm] = String(a.time || '12:00').split(':').map((x) => parseInt(x, 10));
                const d = new Date(`${a.date}T${String(hh).padStart(2, '0')}:${String(Number.isNaN(mm) ? 0 : mm).padStart(2, '0')}:00`);
                return d.getTime() || 0;
            } catch {
                return 0;
            }
        };

        const aptRows = fromApts.map((a) => ({ ...a, _sortKey: sortKeyFromApt(a) }));
        const safeConsults = Array.isArray(doctorConsultRequests) ? doctorConsultRequests.filter(Boolean) : [];
        const drRows = safeConsults.map((d) => {
            if (!d.createdAt) return null;
            const created = new Date(d.createdAt);
            if (isNaN(created.getTime())) return null;
            return {
                ...d,
                time: created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                date: calendarDateKeyInTz(created, APPOINTMENT_DISPLAY_TZ),
                _sortKey: created.getTime()
            };
        }).filter(Boolean);

        return [...aptRows, ...drRows]
            .sort((x, y) => (x._sortKey || 0) - (y._sortKey || 0))
            .map((row) => {
                const next = { ...row };
                delete next._sortKey;
                return next;
            });
    }, [appointments, doctorConsultRequests]);

    const todayWaiting = useMemo(() => {
        const todayStr = calendarDateKeyInTz(new Date(), APPOINTMENT_DISPLAY_TZ);
        const base = (Array.isArray(appointments) ? appointments : []).filter(
            (a) =>
                a.date === todayStr &&
                (a.status === 'CONFIRME' || a.status === 'EN_COURS')
        );
        const joinedAtByPatient = new Map(
            (waitingRoom || []).filter(Boolean).map((e) => [e.patientId, new Date(e.joinedAt).getTime()])
        );
        return [...base].sort((a, b) => {
            if (!a || !b) return 0;
            const ja = a.patientId != null ? joinedAtByPatient.get(a.patientId) : undefined;
            const jb = b.patientId != null ? joinedAtByPatient.get(b.patientId) : undefined;
            if (ja != null && jb != null && ja !== jb) return ja - jb;
            if (ja != null && jb == null) return -1;
            if (ja == null && jb != null) return 1;
            if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
            return (a.time || '').localeCompare(b.time || '');
        });
    }, [appointments, waitingRoom]);

    const expectedToday = useMemo(() => {
        const base = todayWaiting.filter(p => p.presenceStatus !== 'PRESENT' && p.status !== 'EN_COURS');
        if (todayWaiting.length === 0) return demoPatients.filter(p => p.presenceStatus !== 'PRESENT');
        return base;
    }, [todayWaiting, demoPatients]);

    const presentToday = useMemo(() => {
        const base = todayWaiting.filter(p => p.presenceStatus === 'PRESENT' || p.status === 'EN_COURS');
        if (todayWaiting.length === 0) return demoPatients.filter(p => p.presenceStatus === 'PRESENT' || p.status === 'EN_COURS');
        return base;
    }, [todayWaiting, demoPatients]);

    const doctorAvailability = (d) => {
        if (!d) return 'Indisponible';
        return d.status ?? d.statut ?? 'Indisponible';
    };
    const isDoctorSelectable = (d) => doctorAvailability(d) === 'Disponible';

    useEffect(() => {
        if (selectedDoctorId == null) return;
        const d = doctors.find((x) => x.id === selectedDoctorId);
        const av = d ? (d.status ?? d.statut) : '';
        if (!d || av !== 'Disponible') {
            setSelectedDoctorId(null);
        }
    }, [doctors, selectedDoctorId]);

    const actionLock = useRef(false);
    const runAction = async (busyLabel, fn) => {
        if (actionLock.current) return;
        actionLock.current = true;
        setBusyKey(busyLabel);
        try {
            await fn();
        } finally {
            actionLock.current = false;
            setBusyKey(null);
        }
    };

    const handleTacticalUpdate = async (id, data) => {
        if (String(id).startsWith('demo-')) {
            setDemoPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
            return;
        }
        await runAction(`tactical-${id}`, async () => {
            try {
                if (data.presenceStatus) {
                    await api.patch(`/sous-admin/appointments/${id}/presence`, { presenceStatus: data.presenceStatus });
                } else if (data.isUrgent !== undefined) {
                    await api.patch(`/sous-admin/appointments/${id}/urgent`, { isUrgent: data.isUrgent });
                }
                const res = await api.get('/professionals/all-appointments');
                setAppointments(res.data);
            } catch (err) {
                console.error("Tactical update error:", err);
            }
        });
    };

    const handleCheckout = async (id) => {
        if (String(id).startsWith('demo-')) {
            setDemoPatients(prev => prev.filter(p => p.id !== id));
            return;
        }
        await runAction(`checkout-${id}`, async () => {
            try {
                await api.patch(`/sous-admin/appointments/${id}/checkout`);
                const res = await api.get('/professionals/all-appointments');
                setAppointments(res.data);
            } catch (err) {
                console.error("Checkout error:", err);
            }
        });
    };

    const handleStartConsultation = async (id) => {
        if (String(id).startsWith('demo-')) {
            setDemoPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'EN_COURS', presenceStatus: 'PRESENT' } : p));
            return;
        }
        await runAction(`start-${id}`, async () => {
            try {
                await api.patch(`/sous-admin/appointments/${id}/presence`, { presenceStatus: 'PRESENT' });
                const res = await api.get('/professionals/all-appointments');
                setAppointments(res.data);
            } catch (err) {
                console.error("Start consultation error:", err);
            }
        });
    };

    const handlePlanify = async (requestId) => {
        if (!selectedDate || !selectedHour || !selectedMinute || !selectedDoctorId || !selectedLocation || !selectedRoom) return;

        await runAction('planify', async () => {
            try {
                setPlanificationError('');
                const finalDate = utcInstantFromWallClock(
                    selectedDate,
                    parseInt(String(selectedHour), 10),
                    parseInt(String(selectedMinute), 10),
                    APPOINTMENT_DISPLAY_TZ,
                );
                const row = sortedRequests.find((r) => r.id === requestId);
                const isDoctorDemand = row?.requestType === 'CONSULTATION_DR';

                if (isDoctorDemand) {
                    if (row?.patientId == null) {
                        setPlanificationError(
                            'Impossible d’identifier le patient pour cette demande. Demandez une nouvelle demande depuis le médecin ou saisissez le RDV manuellement.'
                        );
                        return;
                    }
                    await api.post('/sous-admin/appointments/create', {
                        patientId: row.patientId,
                        medecinId: parseInt(selectedDoctorId, 10),
                        date: finalDate.toISOString(),
                        lieu: selectedLocation,
                        salle: selectedRoom,
                        motif: 'Nouvelle consultation (demande du médecin traitant)'
                    });
                    if (row.notificationId != null) {
                        await api.delete(`/sous-admin/doctor-consultation-requests/${row.notificationId}`);
                    }
                    const [res, drRes] = await Promise.all([
                        api.get('/professionals/all-appointments'),
                        api.get('/sous-admin/doctor-consultation-requests')
                    ]);
                    setAppointments(res.data);
                    setDoctorConsultRequests(Array.isArray(drRes.data) ? drRes.data : []);
                } else {
                    await api.patch(`/sous-admin/appointments/${requestId}/assign`, {
                        date: finalDate,
                        medecinId: parseInt(selectedDoctorId),
                        lieu: selectedLocation,
                        salle: selectedRoom
                    });

                    const res = await api.get('/professionals/all-appointments');
                    setAppointments(res.data);
                }
                setPlanningRequestId(null);
            } catch (err) {
                console.error("Planify error:", err);
                const backendMessage = err?.response?.data?.error || '';
                if (backendMessage.toLowerCase().includes('médecin')) {
                    setPlanificationError("Le médecin est occupé ou indisponible à cette heure. Choisissez un autre créneau.");
                } else if (backendMessage.toLowerCase().includes('salle')) {
                    setPlanificationError("La salle est déjà occupée à cette heure. Sélectionnez une autre salle ou un autre créneau.");
                } else if (err?.response?.status === 409) {
                    setPlanificationError("Un autre patient est déjà planifié sur ce créneau. Merci de choisir une autre heure.");
                } else {
                    setPlanificationError("Impossible de planifier ce rendez-vous pour le moment. Réessayez.");
                }
            }
        });
    };

    const handleRejectRequest = async (requestId) => {
        await runAction(`reject-${requestId}`, async () => {
            try {
                if (typeof requestId === 'string' && requestId.startsWith('dr-consult-')) {
                    const nid = parseInt(String(requestId).replace('dr-consult-', ''), 10);
                    await api.delete(`/sous-admin/doctor-consultation-requests/${nid}`);
                    const drRes = await api.get('/sous-admin/doctor-consultation-requests');
                    setDoctorConsultRequests(Array.isArray(drRes.data) ? drRes.data : []);
                } else {
                    await api.patch(`/sous-admin/appointments/${requestId}/reject-request`);
                    const res = await api.get('/professionals/all-appointments');
                    setAppointments(res.data);
                }
                if (planningRequestId === requestId) setPlanningRequestId(null);
            } catch (err) {
                console.error("Reject request error:", err);
            }
        });
    };

    const handleCancelAppointment = async (requestId) => {
        await runAction(`cancel-${requestId}`, async () => {
            try {
                await api.patch(`/sous-admin/appointments/${requestId}/cancel`);
                const res = await api.get('/professionals/all-appointments');
                setAppointments(res.data);
                if (planningRequestId === requestId) setPlanningRequestId(null);
            } catch (err) {
                console.error("Cancel appointment error:", err);
            }
        });
    };


    const handleDragStart = (e, patient) => {
        e.dataTransfer.setData('patientId', patient.id);
        setDraggedPatient(patient);
    };

    const handleDropOnDate = (e, date) => {
        e.preventDefault();
        const patientId = e.dataTransfer.getData('patientId');
        if (!patientId) return;

        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setPlanningRequestId(patientId);
        setIsWizardOpen(false);
        setCurrentStep(2);
    };


    const getAbsenceStatus = (appointmentTime, currentStatus) => {
        if (!appointmentTime || typeof appointmentTime !== 'string') return { text: 'Attendu', type: 'neutral' };
        if (currentStatus === 'PRESENT') return { text: 'Arrivé', type: 'success' };
        if (currentStatus === 'CONFIRME') return { text: 'Confirmé', type: 'info' };
        if (currentStatus === 'ABSENT') return { text: 'Absent', type: 'danger' };


        const [h, m] = appointmentTime.split(':').map(Number);
        const now = new Date();
        const currentTotalMin = now.getHours() * 60 + now.getMinutes();
        const apptMin = h * 60 + m;
        const diff = currentTotalMin - apptMin;

        if (diff > 30) return { text: 'Annulé (30m+)', type: 'danger' };
        if (diff > 10) return { text: 'En Retard (10m+)', type: 'warning' };
        return { text: 'Attendu', type: 'neutral' };
    };

    const filteredDoctors = useMemo(() => {
        const q = doctorSearch.trim().toLowerCase();
        const list = doctors.filter((d) => {
            const name = `${d.nom || ''} ${d.prenom || ''}`.toLowerCase();
            if (q && !name.includes(q)) return false;
            return true;
        });
        return [...list].sort((a, b) => {
            const sa = doctorSchedulingScore(a, doctorAvailability(a));
            const sb = doctorSchedulingScore(b, doctorAvailability(b));
            if (sa !== sb) return sa - sb;
            return `${a.prenom || ''} ${a.nom || ''}`.localeCompare(`${b.prenom || ''} ${b.nom || ''}`, 'fr');
        });
    }, [doctorSearch, doctors]);

    const firstSelectableDoctorIndex = useMemo(
        () => filteredDoctors.findIndex((d) => (d.status ?? d.statut) === 'Disponible'),
        [filteredDoctors]
    );

    const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

    return (
        <div className="mx-auto max-w-[1600px] space-y-10 pb-20 text-start" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <header className="space-y-3 px-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200/60">
                        Coordinateur flux
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                        Données live
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl">
                    Gestion des rendez-vous
                </h1>
                <p className="max-w-2xl text-sm font-medium leading-relaxed text-indigo-950/80">
                    Pilotage du cycle de vie des consultations et coordination patient–médecin.
                </p>
            </header>

            <Card className="mx-4 sm:mx-6 overflow-hidden rounded-[1.75rem] border border-indigo-100/70 bg-white shadow-md shadow-indigo-500/5">
                <Tabs defaultValue="requests" className="w-full">
                    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/50 via-white to-violet-50/30 p-3 sm:p-4">
                        <TabsTrigger
                            value="requests"
                            className="group flex h-14 items-center gap-3 rounded-2xl px-6 text-xs font-bold uppercase tracking-wider text-slate-500 transition-all duration-300 hover:text-slate-700 sm:gap-4 sm:px-8 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10 data-[state=active]:ring-1 data-[state=active]:ring-indigo-100"
                        >
                            <Inbox className="h-4 w-4 shrink-0" />
                            Demandes d&apos;accord
                            <div className="ms-1 flex h-6 min-w-[24px] items-center justify-center rounded-lg border border-indigo-100/70 bg-indigo-50 px-1.5 text-indigo-700">
                                {sortedRequests.length}
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="waiting"
                            className="group flex h-14 items-center gap-3 rounded-2xl px-6 text-xs font-bold uppercase tracking-wider text-slate-500 transition-all duration-300 hover:text-slate-700 sm:gap-4 sm:px-8 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10 data-[state=active]:ring-1 data-[state=active]:ring-indigo-100"
                        >
                            <Users className="h-4 w-4 shrink-0" />
                            Salle d&apos;attente
                            <div className="ms-1 flex h-6 min-w-[24px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100/80 px-1.5 text-slate-600 group-data-[state=active]:border-indigo-100 group-data-[state=active]:bg-indigo-50 group-data-[state=active]:text-indigo-700">
                                {todayWaiting.length}
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="grid grid-cols-1 gap-0 overflow-hidden lg:grid-cols-12">
                            <div className="col-span-12 border-r border-indigo-100/60 bg-white overflow-y-auto max-h-[800px] scrollbar-hide lg:col-span-4">
                                <div className="p-6 border-b border-indigo-100/60 bg-white sticky top-0 z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black uppercase tracking-tight text-indigo-950">Demandes</h3>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                                            {sortedRequests?.length || 0} en attente
                                        </p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                        <Inbox className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-4 p-6">
                                    {(sortedRequests || []).length > 0 ? sortedRequests.filter(Boolean).map((req) => (
                                        <div
                                            key={req.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, req)}
                                            className="group relative flex flex-col gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 cursor-grab active:cursor-grabbing"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-sm font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {req.patientName?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-indigo-950 tracking-tight">{req.patientName || 'Inconnu'}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{req.time}</span>
                                                        {req.requestType === 'CONSULTATION_DR' && (
                                                            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-violet-100 text-violet-800">DR</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-indigo-300 transition-colors">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
                                                Glisser sur une date
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center">
                                            <Inbox className="mx-auto h-8 w-8 text-indigo-100 mb-2" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vide</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-12 bg-slate-50/30 lg:col-span-8 p-8 overflow-y-auto max-h-[800px]">
                                {!planningRequestId ? (
                                    <div className="animate-in fade-in duration-500 border border-slate-100 bg-white rounded-[2.5rem] p-8 shadow-sm">
                                        <div className="mb-8 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tight">Calendrier de planification</h3>
                                                <p className="text-xs font-medium text-slate-500">Glissez une demande sur une date pour commencer.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <h3 className="mr-4 self-center text-sm font-black text-indigo-950 uppercase">
                                                    {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(calendarYear, calendarMonth || 0))}
                                                </h3>
                                                <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl border-slate-100 bg-white shadow-sm hover:border-indigo-200">
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-xl border-slate-100 bg-white shadow-sm hover:border-indigo-200">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-7 gap-3 mb-3">
                                            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => (
                                                <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-indigo-950/30">{d}</div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-3">
                                            {Array.from({ length: days?.[0] ? (days[0].getDay() + 6) % 7 : 0 }).map((_, i) => (
                                                <div key={`empty-${i}`} className="aspect-square bg-slate-100/10 rounded-[2.5rem]" />
                                            ))}
                                            {(days || []).map((day) => {
                                                if (!(day instanceof Date) || isNaN(day.getTime())) return null;
                                                const dateStr = day.toISOString().split('T')[0];
                                                const isToday = day.toDateString() === new Date().toDateString();
                                                const isSelected = selectedDate === dateStr;
                                                const hasAppointments = (appointments || []).some(a => a && calendarDateKeyInTz(a.date, APPOINTMENT_DISPLAY_TZ) === dateStr);

                                                return (
                                                    <div
                                                        key={day.toISOString()}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDropOnDate(e, day)}
                                                        className={`aspect-square relative rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1
                                                            ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-inner' :
                                                                isToday ? 'border-indigo-100 bg-indigo-50/30 text-indigo-600' : 'border-white bg-white hover:border-indigo-100 hover:bg-slate-50/50'}`}
                                                    >
                                                        <span className="text-lg font-black">{day.getDate()}</span>
                                                        {hasAppointments && (
                                                            <div className="flex gap-0.5">
                                                                <div className="h-1 w-1 rounded-full bg-indigo-400" />
                                                                <div className="h-1 w-1 rounded-full bg-indigo-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-right-4 duration-500 bg-white rounded-[2.5rem] border border-indigo-100/50 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                                                        <Activity className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black uppercase tracking-tight">Configuration Séance</h3>
                                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                                                            {sortedRequests.find(r => r.id === planningRequestId)?.patientName || 'Patient'} • Step {currentStep}/4
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => setPlanningRequestId(null)} className="rounded-xl hover:bg-white/10 text-white/70 hover:text-white">
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </div>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4].map(s => (
                                                    <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep >= s ? 'w-12 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'w-4 bg-white/30'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 p-8">
                                            {planificationError && (
                                                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">!</div>
                                                    {planificationError}
                                                </div>
                                            )}

                                            {currentStep === 1 && (
                                                <div className="animate-in fade-in duration-500 space-y-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Choisir la date</h4>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronLeft className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronRight className="w-4 h-4" /></Button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-2">
                                                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                                                            <div key={d} className="text-center text-[9px] font-black uppercase text-slate-300">{d}</div>
                                                        ))}
                                                        {Array.from({ length: days?.[0] ? (days[0].getDay() + 6) % 7 : 0 }).map((_, i) => (
                                                            <div key={`empty-${i}`} className="aspect-square bg-slate-50 rounded-lg" />
                                                        ))}
                                                        {(days || []).map((day) => {
                                                            if (!(day instanceof Date) || isNaN(day.getTime())) return null;
                                                            const dateStr = day.toISOString().split('T')[0];
                                                            const isToday = day.toDateString() === new Date().toDateString();
                                                            const isSelected = selectedDate === dateStr;

                                                            return (
                                                                <button
                                                                    key={day.toISOString()}
                                                                    onClick={() => {
                                                                        setSelectedDate(dateStr);
                                                                        setCurrentStep(2);
                                                                    }}
                                                                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200' : isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-100 hover:border-indigo-300'}`}
                                                                >
                                                                    <span className="text-xs font-black">{day.getDate()}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {currentStep === 2 && (
                                                <div className="animate-in fade-in duration-500 space-y-6">
                                                    <div className="relative group">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                        <input
                                                            type="text"
                                                            placeholder="Rechercher un médecin..."
                                                            className="w-full h-14 pl-12 pr-4 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                                                            value={doctorSearch}
                                                            onChange={(e) => setDoctorSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                                                        {(filteredDoctors || []).map((doc) => {
                                                            const av = doctorAvailability(doc);
                                                            const isDisp = av === 'Disponible';
                                                            return (
                                                                <button
                                                                    key={doc.id}
                                                                    onClick={() => {
                                                                        setSelectedDoctorId(doc.id);
                                                                        setCurrentStep(3);
                                                                    }}
                                                                    className={`p-4 rounded-2xl border text-left transition-all ${selectedDoctorId === doc.id ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                                                                >
                                                                    <div className="font-black text-indigo-950 text-sm">{doc.prenom} {doc.nom}</div>
                                                                    <div className="text-[10px] text-slate-500 uppercase mt-1">{doc.specialite}</div>
                                                                    <div className={`mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isDisp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                        <div className={`w-1 h-1 rounded-full ${isDisp ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                                        {av}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                                        <Button variant="ghost" onClick={() => setCurrentStep(1)} className="h-11 rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-indigo-600">Précédent</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {currentStep === 3 && (
                                                <div className="animate-in fade-in duration-500 space-y-8">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Heure</label>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {HOURS.map(h => (
                                                                    <button
                                                                        key={h}
                                                                        onClick={() => setSelectedHour(h)}
                                                                        className={`h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${selectedHour === h ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                                                    >
                                                                        {h}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Minute</label>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {MINUTES.map(m => (
                                                                    <button
                                                                        key={m}
                                                                        onClick={() => setSelectedMinute(m)}
                                                                        className={`h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${selectedMinute === m ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                                                    >
                                                                        {m}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                                        <Button variant="ghost" onClick={() => setCurrentStep(2)} className="h-11 rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-indigo-600">Précédent</Button>
                                                        <Button disabled={!selectedHour || !selectedMinute} onClick={() => setCurrentStep(4)} className="h-11 rounded-xl bg-slate-900 hover:bg-black text-white px-8 font-black uppercase text-[10px] tracking-widest disabled:opacity-30 border-none">Suivant</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {currentStep === 4 && (
                                                <div className="animate-in fade-in duration-500 space-y-8">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bâtiment</label>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {AVAILABLE_LOCATIONS.map(loc => (
                                                                    <button
                                                                        key={loc}
                                                                        onClick={() => setSelectedLocation(loc)}
                                                                        className={`h-12 px-5 rounded-2xl border text-left font-bold text-xs transition-all ${selectedLocation === loc ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                                                    >
                                                                        {loc}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Salle</label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {availableRooms.map(room => (
                                                                    <button
                                                                        key={room}
                                                                        onClick={() => setSelectedRoom(room)}
                                                                        className={`h-12 rounded-2xl border flex items-center justify-center font-bold text-xs transition-all ${selectedRoom === room ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                                                    >
                                                                        {room}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-[2rem] bg-indigo-50/50 p-6 border border-indigo-100/50">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><Calendar className="w-5 h-5" /></div>
                                                            <div>
                                                                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600/60">Résumé</div>
                                                                <div className="text-sm font-black text-indigo-950 uppercase">{selectedHour}h{selectedMinute} • {selectedLocation} • {selectedRoom}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                                        <Button variant="ghost" onClick={() => setCurrentStep(3)} className="h-11 rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-indigo-600">Précédent</Button>
                                                        <Button onClick={() => handlePlanify(planningRequestId)} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 border-none transition-all">Confirmer la séance</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="waiting" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="p-8 space-y-12" onClick={(e) => { if (e.target === e.currentTarget) setSelectedSeat(null); }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-indigo-950">Salle d'Attente</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">
                                        {presentToday.length} sur place • {expectedToday.length} attendus
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />En Cours</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400 shadow-sm shadow-violet-200" />Confirmé</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-slate-200 bg-white" />Libre</div>
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row items-start gap-8 w-full">
                                <div className="relative overflow-x-auto bg-slate-50/50 rounded-[3.5rem] p-8 xl:p-12 border border-slate-100 shadow-inner flex-[2] w-full min-w-0">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none" />

                                    <div className="flex flex-col xl:flex-row gap-16 justify-center items-start relative z-10">
                                        <div className="flex-1 space-y-8 w-full max-w-[450px]">
                                            <div className="flex items-center justify-between px-4">
                                                <div className="h-[1px] flex-1 mx-6 bg-indigo-100/30" />
                                            </div>
                                            <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                                                {Array.from({ length: 20 }).map((_, i) => {
                                                    const p = presentToday[i] || null;
                                                    const isSelected = p && selectedSeat?.id === p.id;
                                                    const isUrgent = p?.isUrgent;
                                                    const isEnCours = p?.status === 'EN_COURS';

                                                    return (
                                                        <div key={`left-${i}`} className="flex flex-col items-center gap-2.5">
                                                            <button
                                                                onClick={() => p && setSelectedSeat(isSelected ? null : p)}
                                                                className={`group relative w-12 h-14 rounded-2xl transition-all duration-500 ease-out ${!p ? 'bg-slate-50 border-none' : 'bg-indigo-600 shadow-xl shadow-indigo-200'} ${isSelected ? 'scale-110 z-20 shadow-2xl' : 'hover:scale-110 hover:-translate-y-1'}`}
                                                            >
                                                                <div className={`absolute inset-x-2 top-2 h-7 rounded-xl transition-all duration-300 ${!p ? 'bg-slate-200/20' : 'bg-indigo-500/50'}`} />
                                                                <div className="absolute inset-0 flex items-center justify-center pt-3">
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-5 h-5 transition-all ${!p ? 'text-slate-200' : 'text-white'}`}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </div>
                                                                {isUrgent && (
                                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-tr from-rose-500 to-rose-400 rounded-lg flex items-center justify-center z-10 shadow-md shadow-rose-200 border border-white animate-pulse-red">
                                                                        <AlertTriangle className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                                {isEnCours && <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-indigo-600 shadow-sm" />}
                                                            </button>
                                                            {p && (
                                                                <div className="flex flex-col items-center">
                                                                    <span className={`text-[7px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-indigo-600' : 'text-indigo-950/40'}`}>
                                                                        {p.patientName.split(' ')[0]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="hidden xl:flex flex-col items-center justify-between py-12 px-4 opacity-30 h-full self-stretch">
                                            <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-indigo-200 to-transparent" />
                                            <div className="my-6 p-2 rounded-full border border-indigo-100 bg-white">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            </div>
                                            <div className="w-[1px] flex-1 bg-gradient-to-t from-transparent via-indigo-200 to-transparent" />
                                        </div>

                                        <div className="flex-1 space-y-8 w-full max-w-[450px]">
                                            <div className="flex items-center justify-between px-4">
                                                <div className="h-[1px] flex-1 mr-6 bg-indigo-100/30" />
                                            </div>
                                            <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                                                {Array.from({ length: 20 }).map((_, i) => {
                                                    const p = presentToday[i + 20] || null;
                                                    const isSelected = p && selectedSeat?.id === p.id;
                                                    const isUrgent = p?.isUrgent;
                                                    const isEnCours = p?.status === 'EN_COURS';

                                                    return (
                                                        <div key={`right-${i}`} className="flex flex-col items-center gap-2.5">
                                                            <button
                                                                onClick={() => p && setSelectedSeat(isSelected ? null : p)}
                                                                className={`group relative w-12 h-14 rounded-2xl transition-all duration-500 ease-out ${!p ? 'bg-slate-50 border-none' : 'bg-indigo-600 shadow-xl shadow-indigo-200'} ${isSelected ? 'scale-110 z-20 shadow-2xl' : 'hover:scale-110 hover:-translate-y-1'}`}
                                                            >
                                                                <div className={`absolute inset-x-2 top-2 h-7 rounded-xl transition-all duration-300 ${!p ? 'bg-slate-200/20' : 'bg-indigo-500/50'}`} />
                                                                <div className="absolute inset-0 flex items-center justify-center pt-3">
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-5 h-5 transition-all ${!p ? 'text-slate-200' : 'text-white'}`}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </div>
                                                                {isUrgent && (
                                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-tr from-rose-500 to-rose-400 rounded-lg flex items-center justify-center z-10 shadow-md shadow-rose-200 border border-white animate-pulse-red">
                                                                        <AlertTriangle className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                                {isEnCours && <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-indigo-600 shadow-sm" />}
                                                            </button>
                                                            {p && (
                                                                <div className="flex flex-col items-center">
                                                                    <span className={`text-[7px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-indigo-600' : 'text-indigo-950/40'}`}>
                                                                        {p.patientName.split(' ')[0]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>


                                </div>

                                <div className="flex-1 w-full min-w-[350px] space-y-6">
                                    <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Users className="w-5 h-5" /></div>
                                            <h4 className="text-base font-black uppercase tracking-tight text-indigo-950">Patients Attendus Aujourd'hui</h4>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{expectedToday.length} Total</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                                        {expectedToday.map((p) => (
                                            <div key={p.id} className="group relative bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                        {p.patientName?.[0] || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-black text-indigo-950 truncate mb-1 uppercase tracking-tight">{p.patientName}</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{p.time}</span>
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase">•</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{p.doctor}</span>
                                                        </div>
                                                    </div>
                                                    {p.isUrgent && (
                                                        <div className="absolute top-4 right-4 h-6 w-6 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-400 flex items-center justify-center shadow-md shadow-rose-200 animate-pulse-red">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-5 flex gap-2">
                                                    <button
                                                        onClick={() => handleTacticalUpdate(p.id, { presenceStatus: 'PRESENT' })}
                                                        className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[9px] font-black uppercase tracking-widest hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-100 transition-all transform active:scale-95"
                                                    >
                                                        Marquer Présent
                                                    </button>
                                                    <button
                                                        onClick={() => handleTacticalUpdate(p.id, { isUrgent: !p.isUrgent })}
                                                        className={`h-10 px-3 rounded-xl border-2 transition-all ${p.isUrgent ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-slate-100 text-slate-300 hover:border-rose-100 hover:text-rose-400'}`}
                                                    >
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {expectedToday.length === 0 && (
                                            <div className="col-span-full py-12 text-center rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50/50">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tous les patients sont arrivés</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedSeat && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl z-50 px-8">
                                    <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-indigo-100 shadow-2xl p-6 flex items-center gap-8 ring-1 ring-black/5 animate-in slide-in-from-bottom-10 duration-500">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-2xl font-black shadow-lg shadow-indigo-200 shrink-0">
                                            {selectedSeat.patientName?.[0] || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-lg font-black text-indigo-950 uppercase tracking-tight">{selectedSeat.patientName}</div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedSeat.time}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase">•</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedSeat.doctor}</span>
                                                {selectedSeat.isUrgent && (
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest">🔴 Urgent</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {selectedSeat.status === 'EN_COURS' ? (
                                                <button
                                                    onClick={() => handleCheckout(selectedSeat.id)}
                                                    className="h-12 px-8 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 transition-all transform active:scale-95"
                                                >
                                                    Finir & Sortie
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartConsultation(selectedSeat.id)}
                                                    className="h-12 px-8 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 transition-all transform active:scale-95"
                                                >
                                                    ▶ Démarrer l'Appel
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleTacticalUpdate(selectedSeat.id, { isUrgent: !selectedSeat.isUrgent })}
                                                className={`h-12 px-5 rounded-2xl border-2 transition-all transform active:scale-95 ${selectedSeat.isUrgent ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-100 text-slate-300 hover:border-rose-300 hover:text-rose-400'}`}
                                                title={selectedSeat.isUrgent ? "Marquer comme normal" : "Marquer comme urgent"}
                                            >
                                                <AlertTriangle className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setSelectedSeat(null)} className="h-12 w-12 rounded-2xl border-2 border-slate-100 text-slate-300 hover:border-slate-200 flex items-center justify-center text-xl transition-all">
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
