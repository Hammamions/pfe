import {
    Activity,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Inbox,
    Plus,
    Search,
    Send,
    User,
    Users,
    X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import api from '../../lib/api';

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

const generateNextDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        dates.push({
            fullDate: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
            dayNum: d.getDate(),
            month: d.toLocaleDateString('fr-FR', { month: 'short' })
        });
    }
    return dates;
};

export default function SousAdminAppointments() {
    const REFRESH_INTERVAL_MS = 3000;
    const [activeTab, setActiveTab] = useState('requests');
    const [planningRequestId, setPlanningRequestId] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [waitingRoom, setWaitingRoom] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(generateNextDates()[0].fullDate);
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedMinute, setSelectedMinute] = useState(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [doctorSearch, setDoctorSearch] = useState('');
    const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Batiment Principal');
    const [selectedRoom, setSelectedRoom] = useState('A-102');
    const [planificationError, setPlanificationError] = useState('');

    const availableDates = useMemo(() => generateNextDates(), []);
    const selectedTime = selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : null;
    const availableRooms = ROOMS_BY_LOCATION[selectedLocation] || [];

    useEffect(() => {
        let isMounted = true;
        let intervalId = null;
        let firstLoad = true;

        const fetchData = async () => {
            try {
                const ts = Date.now();
                if (isMounted && firstLoad) setLoading(true);
                const [aptsRes, docsRes, wrRes] = await Promise.allSettled([
                    api.get('/professionals/all-appointments', { params: { _t: ts, status: 'live' } }),
                    api.get('/professionals/doctors', { params: { _t: ts, status: 'live' } }),
                    api.get('/sous-admin/waiting-room', { params: { _t: ts } })
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
            } catch (err) {
                console.error("Fetch data error:", err);
            } finally {
                if (isMounted && firstLoad) {
                    setLoading(false);
                    firstLoad = false;
                }
            }
        };

        fetchData();
        intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS);
        window.addEventListener('focus', fetchData);
        document.addEventListener('visibilitychange', fetchData);

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('focus', fetchData);
            document.removeEventListener('visibilitychange', fetchData);
        };
    }, []);

    const sortedRequests = useMemo(() => {
        return appointments.filter(
            a => a.status === 'EN_ATTENTE' || a.requestType === 'ANNULATION' || a.requestType === 'REPORT'
        );
    }, [appointments]);

    const todayWaiting = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const base = appointments.filter(
            (a) =>
                a.date === todayStr &&
                (a.status === 'CONFIRME' || a.status === 'EN_COURS')
        );
        const joinedAtByPatient = new Map(
            (waitingRoom || []).map((e) => [e.patientId, new Date(e.joinedAt).getTime()])
        );
        return [...base].sort((a, b) => {
            const ja = a.patientId != null ? joinedAtByPatient.get(a.patientId) : undefined;
            const jb = b.patientId != null ? joinedAtByPatient.get(b.patientId) : undefined;
            if (ja != null && jb != null && ja !== jb) return ja - jb;
            if (ja != null && jb == null) return -1;
            if (ja == null && jb != null) return 1;
            if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
            return (a.time || '').localeCompare(b.time || '');
        });
    }, [appointments, waitingRoom]);

    const handleTacticalUpdate = async (id, data) => {
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
    };

    const handleCheckout = async (id) => {
        try {
            await api.patch(`/sous-admin/appointments/${id}/checkout`);
            const res = await api.get('/professionals/all-appointments');
            setAppointments(res.data);
        } catch (err) {
            console.error("Checkout error:", err);
        }
    };

    const handlePlanify = async (requestId) => {
        if (!selectedTime || !selectedDoctorId || !selectedLocation || !selectedRoom) return;

        try {
            setPlanificationError('');
            const finalDate = new Date(`${selectedDate}T${selectedHour}:${selectedMinute}:00`);
            await api.patch(`/sous-admin/appointments/${requestId}/assign`, {
                date: finalDate,
                medecinId: parseInt(selectedDoctorId),
                lieu: selectedLocation,
                salle: selectedRoom
            });

            const res = await api.get('/professionals/all-appointments');
            setAppointments(res.data);
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
    };

    const handleRejectRequest = async (requestId) => {
        try {
            await api.patch(`/sous-admin/appointments/${requestId}/reject-request`);
            const res = await api.get('/professionals/all-appointments');
            setAppointments(res.data);
            if (planningRequestId === requestId) setPlanningRequestId(null);
        } catch (err) {
            console.error("Reject request error:", err);
        }
    };

    const handleCancelAppointment = async (requestId) => {
        try {
            await api.patch(`/sous-admin/appointments/${requestId}/cancel`);
            const res = await api.get('/professionals/all-appointments');
            setAppointments(res.data);
            if (planningRequestId === requestId) setPlanningRequestId(null);
        } catch (err) {
            console.error("Cancel appointment error:", err);
        }
    };

    const getAbsenceStatus = (appointmentTime, currentStatus) => {
        if (currentStatus === 'PRESENT') return { text: 'Arrivé', type: 'success' };
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
        return doctors
            .filter(d =>
                d.nom.toLowerCase().includes(doctorSearch.toLowerCase()) &&
                d.statut !== 'En congé'
            );
    }, [doctorSearch, doctors]);

    const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

    if (loading && appointments.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 text-left">
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-tight">Coordinateur Flux</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des Rendez-vous</h1>
                <p className="text-gray-500 text-sm font-medium">Pilotage du cycle de vie des consultations et coordination patient-médecin.</p>
            </div>

            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <Tabs defaultValue="requests" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="w-full h-auto p-4 bg-gray-50/50 flex justify-start items-center gap-2 border-b border-gray-100">
                        <TabsTrigger
                            value="requests"
                            className="h-14 px-8 rounded-2xl flex items-center gap-4 text-xs font-bold uppercase tracking-wider transition-all duration-300
                                     data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-50/50 
                                     text-gray-400 hover:text-gray-600"
                        >
                            <Inbox className="w-4 h-4" />
                            Demandes d'Accord
                            <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50 ml-1">
                                {sortedRequests.length}
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="waiting"
                            className="h-14 px-8 rounded-2xl flex items-center gap-4 text-xs font-bold uppercase tracking-wider transition-all duration-300
                                     data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-50/50 
                                     text-gray-400 hover:text-gray-600"
                        >
                            <Users className="w-4 h-4" />
                            Salle d'attente
                            <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 ml-1">
                                {todayWaiting.length}
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="p-10 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 text-xl uppercase tracking-tighter">File d'Intervention</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1">Tri chronologique strict. Choisissez un créneau pour valider la prise en charge.</p>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {sortedRequests.length > 0 ? sortedRequests.map((req) => (
                                <div key={req.id} className="p-10 hover:bg-indigo-50/5 transition-all duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                                                {req.patientName[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-900 text-xl tracking-tight">{req.patientName}</span>
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-widest">{req.time}</span>
                                                    {req.requestType && (
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${req.requestType === 'ANNULATION' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {req.requestType === 'ANNULATION' ? "Demande d'annulation" : 'Demande de report'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="p-1 rounded bg-blue-50">
                                                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                                                    </div>
                                                    <span className="text-sm text-blue-700 font-extrabold tracking-tight italic opacity-80">{req.motif}</span>
                                                    {req.hasDocuments && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${req.documentsProcessed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {req.documentsProcessed ? 'Pièces traitées' : 'Pièces jointes'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {(req.requestType === 'ANNULATION') ? (
                                                <>
                                                    <Button
                                                        size="xl"
                                                        className="h-14 font-bold uppercase text-xs tracking-[0.2em] px-8 rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                                                        onClick={() => handleCancelAppointment(req.id)}
                                                    >
                                                        Annuler RDV
                                                    </Button>
                                                    <Button
                                                        size="xl"
                                                        className="h-14 font-bold uppercase text-xs tracking-[0.2em] px-8 rounded-2xl bg-gray-100 text-gray-800 hover:bg-gray-200"
                                                        onClick={() => handleRejectRequest(req.id)}
                                                    >
                                                        Refuser
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant={planningRequestId === req.id ? "secondary" : "default"}
                                                        size="xl"
                                                        className={`h-14 font-bold uppercase text-xs tracking-[0.2em] px-8 rounded-2xl transition-all duration-500 ${planningRequestId === req.id ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-none' : 'bg-gray-900 text-white hover:bg-black hover:scale-105 shadow-xl shadow-gray-200'}`}
                                                        onClick={() => {
                                                            setPlanningRequestId(planningRequestId === req.id ? null : req.id);
                                                                setPlanificationError('');
                                                            setSelectedHour(null);
                                                            setSelectedMinute(null);
                                                            setSelectedLocation('Batiment Principal');
                                                            setSelectedRoom('A-102');
                                                            setIsDoctorDropdownOpen(false);
                                                        }}
                                                    >
                                                        {planningRequestId === req.id ? "Fermer" : (req.requestType === 'REPORT' ? 'Replanifier' : 'Planifier')}
                                                        <Calendar className="w-4 h-4 ml-3" />
                                                    </Button>
                                                    {req.requestType === 'REPORT' && (
                                                        <Button
                                                            size="xl"
                                                            className="h-14 font-bold uppercase text-xs tracking-[0.2em] px-8 rounded-2xl bg-gray-100 text-gray-800 hover:bg-gray-200"
                                                            onClick={() => handleRejectRequest(req.id)}
                                                        >
                                                            Refuser
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {planningRequestId === req.id && (
                                        <div className="mt-10 overflow-hidden animate-in fade-in zoom-in-95 duration-700 text-left">
                                            {planificationError && (
                                                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
                                                    <p className="text-sm font-bold text-rose-700">{planificationError}</p>
                                                </div>
                                            )}
                                            <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl border border-gray-50">
                                                <div className="bg-gray-900 rounded-[2.2rem] p-10 text-white space-y-10">
                                                    <div className="flex flex-row items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                                                                <Calendar className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Planifier pour {req.patientName}</h3>
                                                                <p className="text-xs text-gray-400 font-bold mt-1">Coordination de l'agenda médical</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => setPlanningRequestId(null)}
                                                            className="h-12 w-12 p-0 rounded-2xl hover:bg-white/10"
                                                        >
                                                            <X className="w-5 h-5 text-gray-400" />
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">1. Sélectionner la Date</h4>
                                                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                                            {availableDates.map((d) => (
                                                                <button
                                                                    key={d.fullDate}
                                                                    onClick={() => setSelectedDate(d.fullDate)}
                                                                    className={`flex-shrink-0 w-24 h-28 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2 ${selectedDate === d.fullDate ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/30 scale-110 translate-y-[-4px]' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'}`}
                                                                >
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">{d.dayName}</span>
                                                                    <span className={`text-2xl font-bold ${selectedDate === d.fullDate ? 'text-white' : 'text-gray-300'}`}>{d.dayNum}</span>
                                                                    <span className="text-[10px] font-bold opacity-60">{d.month}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
                                                        <div className="space-y-4">
                                                            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">2. Créneau Horaire</h4>
                                                            <div className="space-y-6">
                                                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Heure Sélectionnée</p>
                                                                        <span className="text-xl font-bold text-indigo-400">{selectedHour ? `${selectedHour}h` : "--"}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                                        {HOURS.map((h) => (
                                                                            <button
                                                                                key={h}
                                                                                onClick={() => setSelectedHour(h)}
                                                                                className={`py-2 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${selectedHour === h ? 'bg-white text-gray-900 border-white shadow-lg' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                                                                            >
                                                                                {h}h
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Précision Minute</p>
                                                                        <span className="text-xl font-bold text-emerald-400">{selectedMinute ? `:${selectedMinute}` : ":--"}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                                        {MINUTES.map((m) => (
                                                                            <button
                                                                                key={m}
                                                                                onClick={() => setSelectedMinute(m)}
                                                                                className={`py-2 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${selectedMinute === m ? 'bg-white text-gray-900 border-white shadow-lg' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                                                                            >
                                                                                {m}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">3. Praticien Assigné</h4>
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                                                                    className="w-full h-16 bg-white/5 border-2 border-white/5 rounded-2xl px-6 flex items-center justify-between transition-all hover:bg-white/10 group active:scale-95"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400">
                                                                            <User className="w-5 h-5" />
                                                                        </div>
                                                                        <span className={`text-sm font-bold tracking-tight ${selectedDoctor ? 'text-white' : 'text-gray-500'}`}>
                                                                            {selectedDoctor ? `Dr. ${selectedDoctor.nom}` : "Rechercher un médecin..."}
                                                                        </span>
                                                                    </div>
                                                                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isDoctorDropdownOpen ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {isDoctorDropdownOpen && (
                                                                    <div className="absolute top-full left-0 right-0 mt-3 bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                                                        <div className="p-4 border-b border-white/5">
                                                                            <div className="relative">
                                                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                                                <input
                                                                                    autoFocus
                                                                                    placeholder="Trouver un docteur..."
                                                                                    className="w-full h-12 bg-white/5 rounded-xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all border-none"
                                                                                    value={doctorSearch}
                                                                                    onChange={(e) => setDoctorSearch(e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="max-h-64 overflow-y-auto p-2 scrollbar-hide text-left">
                                                                            {filteredDoctors.map((doc) => (
                                                                                <button
                                                                                    key={doc.id}
                                                                                    onClick={() => {
                                                                                        setSelectedDoctorId(doc.id);
                                                                                        setIsDoctorDropdownOpen(false);
                                                                                    }}
                                                                                    className="w-full p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
                                                                                >
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                                                                            {doc.nom[0]}
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Dr. {doc.nom} {doc.prenom}</div>
                                                                                            <div className={`text-[10px] font-bold uppercase mt-0.5 ${doc.statut === 'En congé' ? 'text-rose-500' : 'text-emerald-500'}`}>{doc.statut}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-4 mt-8">
                                                                <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">4. Lieu & Salle Disponible</h4>
                                                                <div className="grid grid-cols-1 gap-4">
                                                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Lieu</p>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {AVAILABLE_LOCATIONS.map((location) => (
                                                                                <button
                                                                                    key={location}
                                                                                    onClick={() => {
                                                                                        setSelectedLocation(location);
                                                                                        const firstRoom = (ROOMS_BY_LOCATION[location] || [])[0] || '';
                                                                                        setSelectedRoom(firstRoom);
                                                                                    }}
                                                                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${selectedLocation === location ? 'bg-white text-gray-900 border-white shadow-lg' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                                                                                >
                                                                                    {location}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Salle</p>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {availableRooms.map((room) => (
                                                                                <button
                                                                                    key={room}
                                                                                    onClick={() => setSelectedRoom(room)}
                                                                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${selectedRoom === room ? 'bg-white text-gray-900 border-white shadow-lg' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                                                                                >
                                                                                    {room}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400">
                                                                <Send className="w-5 h-5" />
                                                            </div>
                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed text-center sm:text-left">
                                                                Confirmation sécurisée <br />et notification patient immédiate.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            disabled={!selectedTime || !selectedDoctorId || !selectedLocation || !selectedRoom}
                                                            size="xl"
                                                            className={`h-16 w-full sm:w-auto px-12 rounded-[1.5rem] font-bold uppercase text-[13px] tracking-[0.3em] transition-all duration-500 shadow-2xl ${(!selectedTime || !selectedDoctorId || !selectedLocation || !selectedRoom) ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white text-gray-900 hover:scale-105 hover:bg-gray-100 shadow-white/10'}`}
                                                            onClick={() => handlePlanify(req.id)}
                                                        >
                                                            Lancer l'Intervention
                                                            <CheckCircle2 className="w-5 h-5 ml-4" />
                                                        </Button>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="p-20 text-center text-gray-400 font-bold italic">
                                    Aucune demande en attente pour le moment.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="waiting" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="p-10 border-b border-gray-50 bg-gray-50/20 text-left">
                            <h3 className="font-bold text-gray-900 text-xl uppercase tracking-tighter">Flux Tactique</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                Marquez les arrivées pour synchroniser les salles de consultation. L&apos;ordre de la liste suit la table Salle d&apos;attente (arrivée à l&apos;accueil), puis urgence et heure de RDV.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/30">
                                    <tr>
                                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Zone État</th>
                                        <th className="px-10 py-6 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tactique</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {todayWaiting.length > 0 ? todayWaiting.map((p) => (
                                        <tr key={p.id} className={`group hover:bg-indigo-50/5 transition-all duration-500 ${p.presenceStatus === 'PRESENT' ? 'bg-indigo-50/10' : ''}`}>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                        {p.patientName[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-lg tracking-tight mb-1">{p.patientName}</div>
                                                        <button
                                                            type="button"
                                                            title="Cliquer pour marquer urgent ou normal"
                                                            className={`text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all ${p.isUrgent ? 'text-rose-500' : 'text-gray-400'}`}
                                                            onClick={() => handleTacticalUpdate(p.id, { isUrgent: !p.isUrgent })}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${p.isUrgent ? 'bg-rose-500 animate-ping' : 'bg-gray-300'}`} />
                                                            {p.isUrgent ? 'Urgent' : 'Normal'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                        <span className="text-base font-bold text-gray-900">{p.time}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-3">{p.doctor}</div>
                                                    {p.hasDocuments && (
                                                        <div className={`text-[9px] font-bold uppercase tracking-wider pl-3 ${p.documentsProcessed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {p.documentsProcessed ? 'Documents traités' : 'Documents en attente'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                                                    {(() => {
                                                        const stat = getAbsenceStatus(p.time, p.presenceStatus);
                                                        const dotColor = stat.type === 'success' ? 'bg-emerald-500' : stat.type === 'warning' ? 'bg-amber-500' : stat.type === 'danger' ? 'bg-rose-500' : 'bg-gray-200';
                                                        const textColor = stat.type === 'success' ? 'text-emerald-700' : stat.type === 'warning' ? 'text-amber-700' : stat.type === 'danger' ? 'text-rose-700' : 'text-gray-400';
                                                        return (
                                                            <>
                                                                <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ${stat.type === 'warning' ? 'animate-pulse' : ''}`} />
                                                                <span className={`text-[11px] font-bold uppercase tracking-widest ${textColor}`}>
                                                                    {stat.text}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                {(() => {
                                                    const stat = getAbsenceStatus(p.time, p.presenceStatus);
                                                    if (p.presenceStatus === 'ABSENT' || !p.presenceStatus || p.presenceStatus === 'EN_ATTENTE') {
                                                        if (stat.type === 'danger') {
                                                            return (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-none">Rdv Annulé</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter opacity-70">Patient Absent (30m+)</span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-14 bg-emerald-600 text-white hover:bg-emerald-700 font-bold uppercase text-[11px] tracking-widest px-8 rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 transition-all gap-3"
                                                                        onClick={() => handleTacticalUpdate(p.id, { presenceStatus: 'PRESENT' })}
                                                                    >
                                                                        <Plus className="w-5 h-5" />
                                                                        Valider Présence
                                                                    </Button>
                                                                    {stat.type === 'warning' && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-14 bg-gray-900 text-white hover:bg-black font-bold uppercase text-[11px] tracking-widest px-8 rounded-2xl shadow-xl shadow-gray-200 hover:scale-105 transition-all"
                                                                        >
                                                                            Appeler
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    if (p.presenceStatus === 'PRESENT') {
                                                        const canCheckout = p.status === 'EN_COURS';
                                                        return (
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                                                                    {canCheckout ? 'En cours' : 'En attente de son tour'}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={!canCheckout}
                                                                    className={`mt-3 h-12 font-bold uppercase text-[10px] tracking-widest px-6 rounded-2xl shadow-xl transition-all ${canCheckout
                                                                        ? 'bg-gray-900 text-white hover:bg-black shadow-gray-200 hover:scale-105'
                                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-gray-100'
                                                                        }`}
                                                                    onClick={() => handleCheckout(p.id)}
                                                                >
                                                                    Marquer sortie
                                                                </Button>
                                                            </div>
                                                        );
                                                    }
                                                    if (stat.type !== 'danger') {
                                                        return (
                                                            <div className="flex flex-col items-center gap-4">
                                                                <Button
                                                                    size="sm"
                                                                    className="h-14 bg-emerald-600 text-white hover:bg-emerald-700 font-bold uppercase text-[11px] tracking-widest px-8 rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 transition-all gap-3"
                                                                    onClick={() => handleTacticalUpdate(p.id, { presenceStatus: 'PRESENT' })}
                                                                >
                                                                    <Plus className="w-5 h-5" />
                                                                    Valider Présence
                                                                </Button>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="p-20 text-center text-gray-400 font-bold italic">
                                                Aucun patient attendu pour aujourd'hui.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
