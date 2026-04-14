import {
    Activity,
    Calendar as CalendarIcon,
    ChevronRight,
    FileText,
    Inbox,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import api from '../../lib/api';

export default function SousAdminDashboard() {
    const REFRESH_INTERVAL_MS = 3000;
    const SLOTS_PER_DOCTOR = 20; 
    const [stats, setStats] = useState({
        pendingCount: 0,
        documentsToSendCount: 0,
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
                const todayIso = new Date().toISOString().split('T')[0];
                const [statsRes, activitiesRes, aptsRes, doctorsRes] = await Promise.all([
                    api.get('/sous-admin/stats', { params: { _t: ts } }),
                    api.get('/sous-admin/activities', { params: { _t: ts } }),
                    api.get('/professionals/all-appointments', { params: { _t: ts } }),
                    api.get('/sous-admin/doctors', { params: { _t: ts, date: todayIso } })
                ]);

                if (!isMounted) return;

                const pendingAll = aptsRes.data.filter(
                    a => a.status === 'EN_ATTENTE' || a.requestType === 'ANNULATION' || a.requestType === 'REPORT'
                );
                const docsToSend = aptsRes.data.filter(
                    (a) => a.hasDocuments && !a.documentsProcessed
                );
                const todayStr = new Date().toISOString().split('T')[0];
                const confirmedTodayAppointments = aptsRes.data.filter(
                    (a) => a.date === todayStr && a.status === 'CONFIRME'
                );
                const doctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];
                const totalTodaySlots = doctors.length * SLOTS_PER_DOCTOR;
                const availableSlotsCount = Math.max(0, totalTodaySlots - confirmedTodayAppointments.length);
                setStats({
                    
                    pendingCount: pendingAll.length,
                    documentsToSendCount: docsToSend.length,
                    availableSlotsCount,
                    occupiedCount: confirmedTodayAppointments.length,
                    totalTodayCount: totalTodaySlots
                });

                setActivities(activitiesRes.data);

                const pending = pendingAll.slice(0, 3);
                setRecentRequests(pending);
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
           
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pilotage Cardiologie</h1>
                    <p className="text-gray-500 text-sm font-medium">Vue stratégique du service et des flux de patients.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[1.5rem] relative group overflow-hidden min-h-[150px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-white/10">
                                <Inbox className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-100">Action</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest whitespace-nowrap">Demandes à traiter</p>
                            <h3 className="text-4xl leading-none font-black mt-2 tracking-tight">{stats.pendingCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gray-950 text-white rounded-[1.5rem] relative overflow-hidden group min-h-[150px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-white/5">
                                <FileText className="w-5 h-5 text-blue-300" />
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200/70">Docs</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">Documents envoyés par jour</p>
                            <h3 className="text-4xl leading-none font-black mt-2 tracking-tight">{stats.documentsToSendCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-emerald-100 shadow-lg bg-white rounded-[1.5rem] relative overflow-hidden group min-h-[150px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-all">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] uppercase tracking-wider">Dispo</div>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] text-gray-500 font-extrabold uppercase tracking-widest">Slots disponibles</p>
                            <h3 className="text-4xl leading-none font-black text-gray-900 mt-2 tracking-tight">{stats.availableSlotsCount}</h3>
                            <p className="text-[11px] text-gray-500 font-bold mt-2">
                                Confirmés: {stats.occupiedCount} / {stats.totalTodayCount}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900 uppercase tracking-tight">Dernières Demandes</CardTitle>
                                <p className="text-xs text-gray-400 font-bold mt-1">Nouvelles demandes, reports et annulations.</p>
                            </div>
                            <Link to="/sous-admin/appointments">
                                <Button variant="ghost" className="text-indigo-600 font-bold text-xs uppercase tracking-wider gap-2">
                                    Tout Gérer <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-10 divide-y divide-gray-50">
                            {recentRequests.length > 0 ? recentRequests.map((req) => (
                                <div key={req.id} className="py-6 first:pt-0 last:pb-0 flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {req.patientName[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{req.patientName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-blue-700 opacity-70">{req.motif}</span>
                                                {req.requestType && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${req.requestType === 'ANNULATION' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {req.requestType === 'ANNULATION' ? 'Annulation' : 'Report'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Link to="/sous-admin/appointments">
                                        <Button size="sm" className="bg-gray-100 text-gray-900 hover:bg-gray-900 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-wider h-10 shadow-none">
                                            Traiter
                                        </Button>
                                    </Link>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-gray-400 font-bold italic">
                                    Aucune demande à traiter
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                <div className="space-y-10 text-left">
                    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-xl font-bold flex items-center gap-4 text-gray-900 uppercase tracking-tight">
                                <Activity className="w-7 h-7 text-indigo-600" />
                                Flux Récents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-4 space-y-8">
                            {activities.map((act, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 group-hover:scale-150 transition-all" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">{act.action}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{act.time}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
