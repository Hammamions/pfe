import {
    Activity,
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import api from '../../lib/api';
import { calendarDateKeyInTz } from '../../lib/appointmentTz';

const defaultMetrics = {
    activePatients: 0,
    consultationsThisMonth: 0,
    consultationsTrendUp: false,
    stats: { consultations: 0, ordonnances: 0, newPatients: 0, averageMinutes: null },
    alerts: { pendingConfirmationTomorrow: 0, pendingConfirmationLater: 0 }
};

const sanitizeMotif = (motif) => {
    if (typeof motif !== 'string') return '';
    return motif
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export default function DoctorDashboardPage() {
    const [waitingPatients, setWaitingPatients] = useState([]);
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [metrics, setMetrics] = useState(defaultMetrics);
    const [loading, setLoading] = useState(true);
    const today = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    useEffect(() => {
        let mounted = true;
        const fetchDoctorData = async () => {
            try {
                const todayKey = calendarDateKeyInTz(new Date());
                const [waitingRes, agendaRes, metricsRes] = await Promise.all([
                    api.get('/professionals/doctor-waiting-room', { params: { _t: Date.now() } }),
                    api.get('/professionals/doctor-agenda', { params: { date: todayKey, _t: Date.now() } }),
                    api.get('/professionals/doctor-dashboard-metrics', { params: { _t: Date.now() } })
                ]);
                if (!mounted) return;
                setWaitingPatients(Array.isArray(waitingRes.data) ? waitingRes.data : []);
                setTodayAppointments(Array.isArray(agendaRes.data) ? agendaRes.data : []);
                const m = metricsRes.data;
                if (m && typeof m === 'object') {
                    setMetrics({
                        activePatients: Number(m.activePatients) || 0,
                        consultationsThisMonth: Number(m.consultationsThisMonth) || 0,
                        consultationsTrendUp: Boolean(m.consultationsTrendUp),
                        stats: {
                            consultations: Number(m.stats?.consultations) || 0,
                            ordonnances: Number(m.stats?.ordonnances) || 0,
                            newPatients: Number(m.stats?.newPatients) || 0,
                            averageMinutes:
                                m.stats?.averageMinutes != null ? Number(m.stats.averageMinutes) : null
                        },
                        alerts: {
                            pendingConfirmationTomorrow: Number(m.alerts?.pendingConfirmationTomorrow) || 0,
                            pendingConfirmationLater: Number(m.alerts?.pendingConfirmationLater) || 0
                        }
                    });
                } else {
                    setMetrics(defaultMetrics);
                }
            } catch (err) {
                console.error('Doctor dashboard fetch error:', err);
                if (mounted) {
                    setWaitingPatients([]);
                    setTodayAppointments([]);
                    setMetrics(defaultMetrics);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchDoctorData();
        const intervalId = setInterval(fetchDoctorData, 5000);
        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, []);

    return (

        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-indigo-950 tracking-tight">Tableau de bord</h2>
                <p className="text-indigo-900/60 mt-2">
                    Aperçu de votre activité du <span className="font-medium text-indigo-900">{today}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-900/50">Rendez-vous du jour</p>
                                <p className="text-3xl font-bold text-indigo-950 mt-2">{todayAppointments.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-sky-100/80 text-sky-700 rounded-2xl flex items-center justify-center ring-1 ring-sky-200/50">
                                <Calendar className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-900/50">En salle d'attente</p>
                                <p className="text-3xl font-bold text-indigo-950 mt-2">{waitingPatients.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-violet-100/80 text-violet-700 rounded-2xl flex items-center justify-center ring-1 ring-violet-200/50">
                                <Clock className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-900/50">Patients actifs</p>
                                <p className="text-3xl font-bold text-indigo-950 mt-2">{metrics.activePatients}</p>
                            </div>
                            <div className="w-14 h-14 bg-indigo-100/90 text-indigo-700 rounded-2xl flex items-center justify-center ring-1 ring-indigo-200/50">
                                <Users className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-900/50">Consultations (mois)</p>
                                <p className="text-3xl font-bold text-indigo-950 mt-2">{metrics.consultationsThisMonth}</p>
                            </div>
                            <div className="w-14 h-14 bg-fuchsia-100/70 text-fuchsia-700 rounded-2xl flex items-center justify-center ring-1 ring-fuchsia-200/50">
                                <Activity className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5">
                        <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-indigo-50">
                            <div>
                                <CardTitle className="text-lg font-bold text-indigo-950">Salle d'attente</CardTitle>
                                <CardDescription className="mt-1 text-indigo-900/50">
                                    Patients en attente de consultation
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-800 px-3 py-1 ring-1 ring-indigo-100">
                                {waitingPatients.length} patient(s)
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {loading ? (
                                <div className="text-center py-12 text-indigo-900/50">
                                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    <p className="text-sm">Chargement de la salle d&apos;attente…</p>
                                </div>
                            ) : waitingPatients.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>La salle d'attente est vide</p>
                                </div>
                            ) : (
                                waitingPatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className={`p-5 rounded-xl border transition-all ${patient.isUrgent
                                            ? 'border-red-100 bg-red-50/50'
                                            : 'border-indigo-100/70 bg-white/95 hover:border-indigo-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-indigo-950 text-lg">
                                                            {patient.patient?.prenom} {patient.patient?.nom}
                                                        </h4>
                                                        {patient.isUrgent && (
                                                            <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm">
                                                                Urgente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-indigo-900/65 mt-1 font-medium">{sanitizeMotif(patient.motif) || 'Consultation'}</p>
                                                    <div className="flex items-center gap-2 mt-3 text-sm text-indigo-900/45">
                                                        <Clock className="w-4 h-4" />
                                                        <span>Arrivée: {patient.heure || '--:--'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5">
                        <CardHeader className="px-6 py-5 border-b border-indigo-50">
                            <CardTitle className="text-lg font-bold text-indigo-950">Planning du jour</CardTitle>
                            <CardDescription className="mt-1 text-indigo-900/50">Vos rendez-vous d'aujourd'hui</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {loading ? (
                                <div className="text-center py-10 text-indigo-900/50">
                                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    <p className="text-sm">Chargement du planning…</p>
                                </div>
                            ) : (
                                <>
                                    {todayAppointments.map((apt) => (
                                <div key={apt.id} className="group flex items-center justify-between p-4 bg-white/95 border border-indigo-100/70 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center min-w-[70px]">
                                            <p className="text-xl font-bold text-indigo-600">{apt.heure}</p>
                                        </div>
                                        <div className="w-px h-10 bg-indigo-100 group-hover:bg-indigo-200 transition-colors"></div>
                                        <div>
                                            <h4 className="font-bold text-indigo-950">
                                                {apt.patient.prenom} {apt.patient.nom}
                                            </h4>
                                            <p className="text-sm text-indigo-900/55 font-medium mt-0.5">{sanitizeMotif(apt.motif) || 'Consultation'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-indigo-700/70 bg-indigo-50 px-3 py-1 rounded-full">
                                            prévu
                                        </span>
                                    </div>
                                </div>
                                    ))}
                                </>
                            )}
                            {!loading && todayAppointments.length === 0 && (
                                <div className="text-center py-8 text-gray-400">
                                    Aucun rendez-vous planifié aujourd&apos;hui
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <div className="space-y-5">
                        <h3 className="text-lg font-bold text-indigo-950">Actions rapides</h3>
                        <div className="space-y-3">
                            <Link to="/doctor/patients" className="block">
                                <div className="group flex items-center w-full p-4 bg-white/95 border border-indigo-100/80 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100/80 transition-colors">
                                        <Users className="w-5 h-5 text-indigo-600 group-hover:text-indigo-800" />
                                    </div>
                                    <span className="ml-4 font-semibold text-indigo-900/80 group-hover:text-indigo-950">Fiches patients</span>
                                </div>
                            </Link>
                            <Link to="/doctor/ai-assistant" className="block">
                                <div className="group flex items-center w-full p-4 bg-white/95 border border-indigo-100/80 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center group-hover:bg-violet-100/80 transition-colors">
                                        <Brain className="w-5 h-5 text-violet-600 group-hover:text-violet-800" />
                                    </div>
                                    <span className="ml-4 font-semibold text-indigo-900/80 group-hover:text-indigo-950">Assistant IA</span>
                                </div>
                            </Link>
                            <Link to="/doctor/prescriptions" className="block">
                                <div className="group flex items-center w-full p-4 bg-white/95 border border-indigo-100/80 rounded-xl hover:border-fuchsia-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-fuchsia-50 rounded-lg flex items-center justify-center group-hover:bg-fuchsia-100/70 transition-colors">
                                        <CheckCircle className="w-5 h-5 text-fuchsia-600 group-hover:text-fuchsia-800" />
                                    </div>
                                    <span className="ml-4 font-semibold text-indigo-900/80 group-hover:text-indigo-950">Créer ordonnance</span>
                                </div>
                            </Link>
                            <Link to="/doctor/agenda" className="block">
                                <div className="group flex items-center w-full p-4 bg-white/95 border border-indigo-100/80 rounded-xl hover:border-sky-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center group-hover:bg-sky-100/80 transition-colors">
                                        <Calendar className="w-5 h-5 text-sky-600 group-hover:text-sky-800" />
                                    </div>
                                    <span className="ml-4 font-semibold text-indigo-900/80 group-hover:text-indigo-950">Gérer disponibilités</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <Card className="border border-indigo-100/60 bg-white/90 shadow-sm shadow-indigo-500/5 overflow-hidden">
                        <CardHeader className="border-b border-indigo-50 px-6 py-4 bg-white/95">
                            <CardTitle className="text-base font-bold text-indigo-950">Statistiques</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-indigo-50/90">
                                <div className="flex items-center justify-between p-5 hover:bg-indigo-50/40 transition-colors">
                                    <span className="text-indigo-900/60 font-medium">Consultations (mois)</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-indigo-950 text-lg">{metrics.stats.consultations}</span>
                                        {metrics.consultationsTrendUp && (
                                            <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-5 hover:bg-indigo-50/40 transition-colors">
                                    <span className="text-indigo-900/60 font-medium">Ordonnances</span>
                                    <span className="font-bold text-indigo-950 text-lg">{metrics.stats.ordonnances}</span>
                                </div>
                                <div className="flex items-center justify-between p-5 hover:bg-indigo-50/40 transition-colors">
                                    <span className="text-indigo-900/60 font-medium">Nouveaux patients</span>
                                    <span className="font-bold text-indigo-950 text-lg">{metrics.stats.newPatients}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
