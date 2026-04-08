import {
    Activity,
    Calendar as CalendarIcon,
    ChevronRight,
    Inbox,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import api from '../../lib/api';

export default function SousAdminDashboard() {
    const [stats, setStats] = useState({
        pendingCount: 0,
        todayCount: 0,
        presentCount: 0
    });
    const [recentRequests, setRecentRequests] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {

                const statsRes = await api.get('/sous-admin/stats');
                setStats({
                    pendingCount: statsRes.data.pending,
                    todayCount: statsRes.data.total,
                    presentCount: statsRes.data.present
                });

                const activitiesRes = await api.get('/sous-admin/activities');
                setActivities(activitiesRes.data);

                const aptsRes = await api.get('/professionals/all-appointments');
                const pending = aptsRes.data
                    .filter(a => a.status === 'EN_ATTENTE')
                    .slice(0, 3);
                setRecentRequests(pending);

            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
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
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pilotage Cardiologie</h1>
                    <p className="text-gray-500 text-sm font-medium">Vue stratégique du service et des flux de patients.</p>
                </div>
            </div>

            {/* Compact Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[1.5rem] relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <CardContent className="p-6">
                        <Inbox className="w-8 h-8 text-indigo-200/40 mb-3" />
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest whitespace-nowrap">Demandes En Attente</p>
                        <h3 className="text-2xl font-black mt-1 tracking-tight">{stats.pendingCount}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gray-900 text-white rounded-[1.5rem] relative overflow-hidden group">
                    <CardContent className="p-6">
                        <CalendarIcon className="w-8 h-8 text-indigo-400/40 mb-3" />
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Prévus Ce Jour</p>
                        <h3 className="text-2xl font-black mt-1 tracking-tight">{stats.todayCount}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white rounded-[1.5rem] relative overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-all">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[9px] uppercase tracking-wider animate-pulse">Live</div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.presentCount}</h3>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Patients Présents</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Dashboard Summary Area */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Recent Pending Requests Summary */}
                    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900 uppercase tracking-tight">Dernières Demandes</CardTitle>
                                <p className="text-xs text-gray-400 font-bold mt-1">Actions prioritaires requises.</p>
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
                                            <span className="text-xs font-bold text-blue-700 opacity-70">{req.motif}</span>
                                        </div>
                                    </div>
                                    <Link to="/sous-admin/appointments">
                                        <Button size="sm" className="bg-gray-100 text-gray-900 hover:bg-gray-900 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-wider h-10 shadow-none">
                                            Planifier
                                        </Button>
                                    </Link>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-gray-400 font-bold italic">
                                    Aucune demande en attente
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* Tactical Sidebar */}
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
