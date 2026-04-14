import {
    Activity,
    Mail,
    Search,
    Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import api from '../../lib/api';

const generateNextDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        dates.push({
            dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
            dayNum: d.getDate(),
            fullDate: d.toISOString().split('T')[0]
        });
    }
    return dates;
};

export default function SousAdminDoctors() {
    const [searchQuery, setSearchQuery] = useState('');
    const dates = useMemo(() => generateNextDates(), []);
    const [selectedDate, setSelectedDate] = useState(dates[0].fullDate);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(sessionStorage.getItem('proUser') || '{}');

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/professionals/cardiology?date=${selectedDate}`);
                setDoctors(res.data);
            } catch (err) {
                console.error("Error fetching doctors:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, [selectedDate]);

    const filteredDoctors = doctors.filter(doc =>
        doc.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.prenom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && doctors.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header section with search and Date Scroller */}
            <div className="flex flex-col gap-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Équipe Médicale</h1>
                        <p className="text-gray-500 text-sm font-medium">Capacités de {user.specialite || 'Cardiologie'} pour le jour sélectionné.</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un médecin..."
                            className="h-12 w-64 pl-12 pr-4 bg-white border-none rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Premium Simple Date Scroller */}
                <div className="relative bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100/50 overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-hide gap-3 px-8">
                        {dates.map((date) => (
                            <button
                                key={date.fullDate}
                                onClick={() => setSelectedDate(date.fullDate)}
                                className={`flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${selectedDate === date.fullDate
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedDate === date.fullDate ? 'text-indigo-200' : 'text-gray-400'}`}>
                                    {date.dayName}
                                </span>
                                <span className="text-lg font-bold mt-1">{date.dayNum}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Praticien</th>
                                <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">État</th>
                                <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Saturation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDoctors.map((doc) => {
                                const isOnLeave = doc.statut === 'En congé';
                                const rdvCount = doc.patientsCount;
                                const maxPatients = doc.maxPatients || 20;
                                const placesVides = maxPatients - rdvCount;

                                let dotColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                                let textColor = "text-emerald-700";

                                if (isOnLeave) {
                                    dotColor = "bg-purple-500";
                                    textColor = "text-purple-700";
                                } else if (placesVides === 0) {
                                    dotColor = "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
                                    textColor = "text-rose-700";
                                } else if (placesVides <= 5) {
                                    dotColor = "bg-amber-500";
                                    textColor = "text-amber-700";
                                }

                                return (
                                    <tr key={doc.id} className="group hover:bg-indigo-50/10 transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100 group-hover:scale-110 transition-all">
                                                    {doc.nom[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-lg tracking-tight mb-0.5">Dr. {doc.nom} {doc.prenom}</div>
                                                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{user.specialite}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="space-y-1.5 text-sm font-bold text-gray-600">
                                                <div className="flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {doc.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                                                <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>
                                                    {doc.statut}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 whitespace-nowrap">
                                            <div className="flex flex-col gap-2 min-w-[120px]">
                                                <div className="flex justify-between items-end">
                                                    <span className={`text-sm font-bold ${placesVides === 0 ? 'text-rose-600' : 'text-gray-900'}`}>{rdvCount} / {maxPatients}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">RDV</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${placesVides === 0 ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-blue-600'}`}
                                                        style={{ width: `${(rdvCount / maxPatients) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Quick Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {useMemo(() => {
                    const totalMax = filteredDoctors.reduce((acc, d) => acc + (d.maxPatients || 20), 0) || 1;
                    const totalRDV = filteredDoctors.reduce((acc, d) => acc + d.patientsCount, 0);
                    const saturationTaux = Math.round((totalRDV / totalMax) * 100);
                    const slotsDispo = Math.max(0, totalMax - totalRDV);

                    return (
                        <>
                            <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2rem] relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <CardContent className="p-8">
                                    <Users className="w-10 h-10 text-white/40 mb-4" />
                                    <h4 className="text-xl font-bold uppercase tracking-tight mb-2">Saturation Service</h4>
                                    <p className="text-blue-50/80 text-sm font-medium mb-6">Occupation moyenne : {totalRDV} patients sur {totalMax}.</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                                            <span>Taux d'occupation</span>
                                            <span>{saturationTaux}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full">
                                            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${saturationTaux}%` }} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl bg-white rounded-[2rem] relative overflow-hidden group">
                                <CardContent className="p-8">
                                    <div className="flex items-start justify-between">
                                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-all">
                                            <Activity className="w-8 h-8" />
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg font-bold text-[10px] ${saturationTaux > 90 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {saturationTaux > 90 ? 'CRITIQUE' : 'OPTIMAL'}
                                        </div>
                                    </div>
                                    <div className="mt-8 text-left">
                                        <h4 className="text-xl font-bold tracking-tight text-gray-900">{slotsDispo} Slots Disponibles</h4>
                                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                                            {slotsDispo > 0 ? 'Capacité de prise en charge restante' : 'Service saturé pour ce jour'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl bg-gray-900 text-white rounded-[2rem] relative overflow-hidden group">
                                <CardContent className="p-8">
                                    <div className="flex items-start justify-between">
                                        <div className="p-4 bg-white/5 text-indigo-400 rounded-2xl group-hover:rotate-12 transition-all">
                                            <Users className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <div className="mt-8 text-left">
                                        <h4 className="text-xl font-bold tracking-tight">Vigilance Active</h4>
                                        <div className="flex -space-x-4 mt-4 ring-white ring-2 rounded-full w-fit">
                                            {filteredDoctors.map((doc, i) => (
                                                <div key={doc.id} className={`w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center font-bold text-xs bg-indigo-600`}>
                                                    {doc.nom[0]}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-3">Équipe de Cardiologie de Service</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    );
                }, [filteredDoctors])}
            </div>
        </div>
    );
}
