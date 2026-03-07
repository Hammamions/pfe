import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Clock,
    Activity,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    LogOut,
    Brain,
    Pill,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    mockDoctor,
    mockDoctorAppointments,
    mockWaitingRoom,
} from '../../data/doctorMockData';
import logo from '../../assets/logo sans bg.png';

export default function DoctorDashboardPage() {
    const today = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const waitingPatients = mockWaitingRoom.filter((p) => p.statut === 'en attente');
    const navigate = useNavigate();

    const handleViewPatient = (patient) => {
        navigate('/doctor/patients', {
            state: {
                patientName: patient.nom,
                patientPrenom: patient.prenom
            }
        });
    };

    return (

        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h2>
                <p className="text-gray-600 mt-2">Aperçu de votre activité du <span className="font-medium text-gray-700">{today}</span></p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Rendez-vous du jour</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">5</p>
                            </div>
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Calendar className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">En salle d'attente</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
                            </div>
                            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                                <Clock className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Patients actifs</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">3</p>
                            </div>
                            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                                <Users className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Consultations</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">1</p>
                            </div>
                            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                                <Activity className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Waiting Room */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-gray-50">
                            <div>
                                <CardTitle className="text-lg font-bold">Salle d'attente</CardTitle>
                                <CardDescription className="mt-1">Patients en attente de consultation</CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-3 py-1">
                                {waitingPatients.length} patient(s)
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {waitingPatients.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>La salle d'attente est vide</p>
                                </div>
                            ) : (
                                waitingPatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className={`p-5 rounded-xl border transition-all ${patient.priorite === 'urgente'
                                            ? 'border-red-100 bg-red-50/50'
                                            : 'border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-gray-900 text-lg">
                                                            {patient.prenom} {patient.nom}
                                                        </h4>
                                                        {patient.priorite === 'urgente' && (
                                                            <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm">
                                                                Urgente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 mt-1 font-medium">{patient.motif}</p>
                                                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                                                        <Clock className="w-4 h-4" />
                                                        <span>Arrivée: {patient.heureArrivee}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Daily Schedule */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="px-6 py-5 border-b border-gray-50">
                            <CardTitle className="text-lg font-bold">Planning du jour</CardTitle>
                            <CardDescription className="mt-1">Vos rendez-vous d'aujourd'hui</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {mockDoctorAppointments.map((apt) => (
                                <div key={apt.id} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all duration-200">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center min-w-[70px]">
                                            <p className="text-xl font-bold text-blue-600">{apt.heure}</p>
                                            <p className="text-xs font-medium text-gray-400 mt-0.5">{apt.duree} min</p>
                                        </div>
                                        <div className="w-px h-10 bg-gray-100 group-hover:bg-blue-100 transition-colors"></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">
                                                {apt.patient.prenom} {apt.patient.nom}
                                            </h4>
                                            <p className="text-sm text-gray-500 font-medium mt-0.5">{apt.motif}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">prévu</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-4 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                            onClick={() => handleViewPatient(apt.patient)}
                                        >
                                            Voir
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="space-y-5">
                        <h3 className="text-lg font-bold text-gray-900">Actions rapides</h3>
                        <div className="space-y-3">
                            <Link to="/doctor/patients" className="block">
                                <div className="group flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-green-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors">
                                        <Users className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
                                    </div>
                                    <span className="ml-4 font-semibold text-gray-700 group-hover:text-gray-900">Fiches patients</span>
                                </div>
                            </Link>
                            <Link to="/doctor/ai-assistant" className="block">
                                <div className="group flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                        <Brain className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                                    </div>
                                    <span className="ml-4 font-semibold text-gray-700 group-hover:text-gray-900">Assistant IA</span>
                                </div>
                            </Link>
                            <Link to="/doctor/prescriptions" className="block">
                                <div className="group flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                                        <CheckCircle className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
                                    </div>
                                    <span className="ml-4 font-semibold text-gray-700 group-hover:text-gray-900">Créer ordonnance</span>
                                </div>
                            </Link>
                            <Link to="/doctor/agenda" className="block">
                                <div className="group flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                                        <Calendar className="w-5 h-5 text-gray-600 group-hover:text-orange-600" />
                                    </div>
                                    <span className="ml-4 font-semibold text-gray-700 group-hover:text-gray-900">Gérer disponibilités</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-gray-50 px-6 py-4 bg-white">
                            <CardTitle className="text-base font-bold">Statistiques</CardTitle>
                            {/* <CardDescription>Cette semaine</CardDescription> */}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-50">
                                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                                    <span className="text-gray-600 font-medium">Consultations</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 text-lg">42</span>
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                                    <span className="text-gray-600 font-medium">Ordonnances</span>
                                    <span className="font-bold text-gray-900 text-lg">38</span>
                                </div>
                                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                                    <span className="text-gray-600 font-medium">Nouveaux patients</span>
                                    <span className="font-bold text-gray-900 text-lg">5</span>
                                </div>
                                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                                    <span className="text-gray-600 font-medium">Temps moyen</span>
                                    <span className="font-bold text-gray-900 text-lg">28 min</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    {/* The user screenshot shows this as a card with an light orange background and specific spacing */}
                    <Card className="border-orange-100 bg-orange-50/50 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-orange-900 text-lg font-bold">
                                <AlertCircle className="w-5 h-5" />
                                Alertes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-orange-100">
                                <p className="font-bold text-orange-900 mb-1">
                                    2 résultats d'analyses disponibles
                                </p>
                                <p className="text-orange-700 text-xs font-semibold">À vérifier</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-orange-100">
                                <p className="font-bold text-orange-900 mb-1">
                                    1 rendez-vous à confirmer
                                </p>
                                <p className="text-orange-700 text-xs font-semibold">Pour demain</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
