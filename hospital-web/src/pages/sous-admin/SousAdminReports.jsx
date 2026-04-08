import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Filter,
    RefreshCw,
    TrendingUp,
    UserPlus,
    Users
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { mockDepartmentStats, mockRecentActivity, mockSousAdmin } from '../../data/sousAdminMockData';

export default function SousAdminReports() {
    const iconMap = {
        CheckCircle: CheckCircle,
        Calendar: Calendar,
        UserPlus: UserPlus,
        RefreshCw: RefreshCw
    };

    const stats = [
        { label: "Patients Traités", value: mockDepartmentStats.totalConsultations, trend: "+12%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Temps d'Attente", value: mockDepartmentStats.avgWaitTime, trend: "-2m", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Satisfaction", value: mockDepartmentStats.satisfactionRate, trend: "+2%", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Croissance", value: mockDepartmentStats.revenueIncrease, trend: "Stable", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight italic">Rapports d'Activité</h1>
                    <p className="text-gray-500 text-sm font-medium">Analyse des performances et pilotage stratégique de {mockSousAdmin.specialite}.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-12 font-black uppercase text-[10px] tracking-widest px-6 rounded-2xl border-gray-200 gap-2 hover:bg-gray-50 transition-all">
                        <Filter className="w-4 h-4" />
                        Filtrer Période
                    </Button>
                    <Button className="h-12 bg-gray-900 text-white hover:bg-black font-black uppercase text-[10px] tracking-widest px-8 rounded-2xl shadow-xl transition-all gap-2">
                        <Download className="w-4 h-4" />
                        Exporter PDF
                    </Button>
                </div>
            </div>

            {/* Performance Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 group rounded-[2rem] overflow-hidden bg-white">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className={`w-7 h-7 ${stat.color}`} />
                                </div>
                                <div className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                                    <ArrowUpRight className="w-4 h-4" />
                                    {stat.trend}
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 leading-none">{stat.value}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Visual Distribution Chart (CSS-based) */}
                <Card className="lg:col-span-2 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-black flex items-center gap-4 text-gray-900 uppercase tracking-tighter italic">
                            <BarChart3 className="w-7 h-7 text-indigo-600" />
                            Volume Patient (6 derniers mois)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 pt-20">
                        <div className="h-64 flex items-end justify-between gap-6 px-4">
                            {mockDepartmentStats.monthlyPatients.map((val, i) => {
                                const heightPc = (val / 700) * 100;
                                return (
                                    <div key={i} className="flex-1 group relative flex flex-col items-center">
                                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                                            {val} pts
                                        </div>
                                        <div
                                            className={`w-full rounded-2xl transition-all duration-1000 ${i === 5 ? 'bg-gradient-to-t from-indigo-600 to-blue-500 shadow-xl shadow-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}
                                            style={{ height: `${heightPc}%` }}
                                        />
                                        <span className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">M{i + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Log */}
                <Card className="border-none shadow-2xl bg-gray-900 text-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-white/5">
                        <CardTitle className="text-xl font-black flex items-center gap-4 uppercase tracking-tighter italic">
                            <Activity className="w-7 h-7 text-indigo-400" />
                            Flux Récents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        {mockRecentActivity.map((act) => {
                            const Icon = iconMap[act.icon] || CheckCircle;
                            return (
                                <div key={act.id} className="flex gap-5 group cursor-default">
                                    <div className="mt-1">
                                        <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-white/10 transition-all">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-extrabold text-sm text-gray-100 italic group-hover:text-blue-400 transition-colors uppercase tracking-tight">{act.action}</div>
                                        <div className="text-xs font-bold text-indigo-400/80">{act.target}</div>
                                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{act.time}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <Button variant="ghost" className="w-full h-14 border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-gray-500 hover:text-white hover:bg-white/5 mt-4">
                            Voir Tout l'Historique
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
