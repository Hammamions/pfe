import {
    Activity,
    AlertCircle,
    ArrowUp,
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    Database,
    Edit,
    FileText,
    FileText as FileTextIcon,
    HardDrive,
    Plus,
    RefreshCw,
    Save,
    Server,
    Trash2,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const mockStats = [
    {
        id: "mockdoctors",
        title: "Médecins actifs",
        value: "6",
        subtext: "sur 6 total",
        icon: Users,
        color: "text-purple-600",
        bg: "bg-purple-100"
    },
    {
        id: "patients",
        title: "Patients inscrits",
        value: "247",
        subtext: "+12 ce mois",
        trend: "up",
        icon: UserPlus,
        color: "text-blue-600",
        bg: "bg-blue-100"
    },
    {
        id: "rdv",
        title: "RDV aujourd'hui",
        value: "34",
        subtext: "Planifiés",
        icon: Calendar,
        color: "text-green-600",
        bg: "bg-green-100"
    },
    {
        id: "system",
        title: "Activité système",
        value: "98%",
        subtext: "Opérationnel",
        icon: Activity,
        color: "text-orange-600",
        bg: "bg-orange-100"
    }
];

const mockDoctors = [
    { id: 1, name: "Dr. Sophie Martin", specialty: "Cardiologie", status: "actif", initials: "SM", color: "bg-purple-100 text-purple-700", patients: 45, consultations: 120, email: "s.martin@hopital.com", phone: "+216 91 123 456", address: "15 Rue de la Paix, Tunis", licenseNumber: "CN-12345" },
    { id: 2, name: "Dr. Jean Dubois", specialty: "Dermatologie", status: "actif", initials: "JD", color: "bg-blue-100 text-blue-700", patients: 38, consultations: 95, email: "j.dubois@hopital.com", phone: "+216 92 123 456", address: "8 Avenue Habib Bourguiba, Tunis", licenseNumber: "CN-12346" },
    { id: 3, name: "Dr. Claire Rousseau", specialty: "Médecine générale", status: "actif", initials: "CR", color: "bg-pink-100 text-pink-700", patients: 52, consultations: 145, email: "c.rousseau@hopital.com", phone: "+216 93 123 456", address: "3 Rue de Marseille, Tunis", licenseNumber: "CN-12347" },
    { id: 4, name: "Dr. Pierre Lefevre", specialty: "Chirurgie", status: "inactif", initials: "PL", color: "bg-indigo-100 text-indigo-700", patients: 27, consultations: 68, email: "p.lefevre@hopital.com", phone: "+216 94 123 456", address: "12 Rue de Carthage, Tunis", licenseNumber: "CN-12348" },
    { id: 5, name: "Dr. Anne Petit", specialty: "Pédiatrie", status: "congé", initials: "AP", color: "bg-green-100 text-green-700", patients: 41, consultations: 112, email: "a.petit@hopital.com", phone: "+216 95 123 456", address: "7 Rue de Londres, Tunis", licenseNumber: "CN-12349" },
    { id: 6, name: "Dr. Abir kraim", specialty: "Cardiologie", status: "actif", initials: "AK", color: "bg-green-100 text-green-700", patients: 33, consultations: 87, email: "a.kraim@hopital.com", phone: "+216 96 123 456", address: "22 Rue de France, Tunis", licenseNumber: "CN-12350" },
];

const patients = [
    { id: 1, name: "Ali Ben Salah", age: 45 },
    { id: 2, name: "Sara Trabelsi", age: 32 },
    { id: 3, name: "Mohamed Gharbi", age: 60 }
];

const rdvs = [
    { id: 1, patient: "Ali Ben Salah", doctor: "Dr. Sophie Martin", time: "09:00" },
    { id: 2, patient: "Sara Trabelsi", doctor: "Dr. Jean Dubois", time: "11:30" },
    { id: 3, patient: "Mohamed Gharbi", doctor: "Dr. Claire Rousseau", time: "15:00" }
];

const mockActivity = [
    { text: "Dr. Anne Petit a été ajouté", time: "Il y a 2 heures", type: "add" },
    { text: "5 nouveaux patients inscrits", time: "Il y a 4 heures", type: "user" },
    { text: "Mise à jour système effectuée", time: "Il y a 1 jour", type: "system" },
];

const mockReports = [
    { patient: "Alice Ben Salah", consultation: "Cardiologie", date: "15-02-2026", ordonnance: 2, documents: 1 },
    { patient: "Mohamed Trabelsi", consultation: "Dermatologie", date: "14-02-2026", ordonnance: 1, documents: 0 },
];

const mockLogs = [
    { timestamp: "2026-02-22 10:23:45", level: "info", message: "Connexion administrateur réussie", user: "admin@hopital.com" },
    { timestamp: "2026-02-22 09:15:22", level: "info", message: "Sauvegarde automatique terminée", size: "2.3 GB" },
    { timestamp: "2026-02-22 08:45:10", level: "warning", message: "Tentative de connexion échouée", ip: "192.168.1.45" },
    { timestamp: "2026-02-22 07:30:05", level: "info", message: "Service de notifications redémarré" },
    { timestamp: "2026-02-21 23:15:30", level: "error", message: "Timeout sur requête API", endpoint: "/api/patients" },
];

const mockAlerts = [
    { id: 1, severity: "high", message: "Espace disque critique sur serveur DB", time: "Il y a 30min", acknowledged: false },
    { id: 2, severity: "medium", message: "2 comptes médecins en attente de validation", time: "Il y a 2h", acknowledged: false },
    { id: 3, severity: "low", message: "Maintenance programmée dans 3 jours", time: "Il y a 5h", acknowledged: true },
    { id: 4, severity: "medium", message: "Pic de trafic anormal détecté", time: "Il y a 1h", acknowledged: false },
];

const specialties = [
    "Cardiologie",
    "Dermatologie",
    "Médecine générale",
    "Chirurgie",
    "Pédiatrie",
    "Gynécologie",
    "Neurologie",
    "Ophtalmologie",
    "Radiologie",
    "Psychiatrie"
];

const avatarColors = [
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-red-100 text-red-700",
    "bg-orange-100 text-orange-700"
];

export default function AdminDashboard() {
    const [activeSection, setActiveSection] = useState(null);
    const [showAllDoctors, setShowAllDoctors] = useState(false);
    const [showDoctorsList, setShowDoctorsList] = useState(false);
    const [showReportsList, setShowReportsList] = useState(false);
    const [doctors, setDoctors] = useState(mockDoctors);
    const [showSystemSurveillance, setShowSystemSurveillance] = useState(false);

    const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
    const [showEditDoctorForm, setShowEditDoctorForm] = useState(false);
    const [doctorToEdit, setDoctorToEdit] = useState(null);
    const [newDoctor, setNewDoctor] = useState({
        name: "",
        specialty: "Cardiologie",
        email: "",
        phone: "",
        address: "",
        licenseNumber: "",
        status: "actif"
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const [showLogs, setShowLogs] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
    const [alerts, setAlerts] = useState(mockAlerts);
    const [activities, setActivities] = useState(mockActivity);

    const addActivity = (text, type) => {
        const newActivity = {
            text,
            time: "À l'instant",
            type
        };
        setActivities(prev => [newActivity, ...prev]);
    };
    const [surveillanceData, setSurveillanceData] = useState({
        cpu: 45,
        memory: { used: 6.2, total: 16 },
        disk: { used: 234, total: 500 },
        responseTime: 124,
        requestsPerMin: 2345,
        errors: 3,
        uptime: 99.9,
        services: {
            database: "operational",
            api: "operational",
            auth: "operational",
            notifications: "degraded"
        }
    });

    const displayedDoctors = showAllDoctors ? doctors : doctors.slice(0, 3);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setSurveillanceData({
                cpu: Math.floor(Math.random() * 30) + 30,
                memory: { used: (Math.random() * 4 + 4).toFixed(1), total: 16 },
                disk: { used: Math.floor(Math.random() * 50 + 200), total: 500 },
                responseTime: Math.floor(Math.random() * 50 + 100),
                requestsPerMin: Math.floor(Math.random() * 500 + 2000),
                errors: Math.floor(Math.random() * 5),
                uptime: 99.9,
                services: {
                    database: Math.random() > 0.9 ? "degraded" : "operational",
                    api: Math.random() > 0.95 ? "degraded" : "operational",
                    auth: Math.random() > 0.9 ? "degraded" : "operational",
                    notifications: Math.random() > 0.7 ? "degraded" : "operational"
                }
            });
            setLastRefreshTime(new Date());
            setIsRefreshing(false);
        }, 1000);
    };

    const handleViewLogs = () => {
        setShowLogs(!showLogs);
        setShowAlerts(false);
    };

    const handleViewAlerts = () => {
        setShowAlerts(!showAlerts);
        setShowLogs(false);
    };

    const acknowledgeAlert = (alertId) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
    };

    const getServiceStatusColor = (status) => {
        switch (status) {
            case "operational": return "text-green-600";
            case "degraded": return "text-yellow-600";
            case "down": return "text-red-600";
            default: return "text-gray-600";
        }
    };

    const getServiceStatusIcon = (status) => {
        switch (status) {
            case "operational": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case "degraded": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            case "down": return <AlertCircle className="w-4 h-4 text-red-600" />;
            default: return null;
        }
    };

    const handleAddDoctor = () => {
        if (!newDoctor.name || !newDoctor.email || !newDoctor.phone) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const nameParts = newDoctor.name.split(" ");
        let initials = "";
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        } else {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }

        const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        const newDoctorObj = {
            id: doctors.length + 1,
            name: newDoctor.name,
            specialty: newDoctor.specialty,
            status: newDoctor.status,
            initials: initials,
            color: randomColor,
            patients: 0,
            consultations: 0,
            email: newDoctor.email,
            phone: newDoctor.phone,
            address: newDoctor.address,
            licenseNumber: newDoctor.licenseNumber
        };

        setDoctors([...doctors, newDoctorObj]);
        setNewDoctor({
            name: "",
            specialty: "Cardiologie",
            email: "",
            phone: "",
            address: "",
            licenseNumber: "",
            status: "actif"
        });
        setShowAddDoctorForm(false);
        setSuccessMessage(`${newDoctor.name} a été ajouté avec succès`);
        setTimeout(() => setSuccessMessage(""), 3000);

        addActivity(`${newDoctor.name} a été ajouté`, "add");
    };

    const handleEditDoctor = (doctor) => {
        setDoctorToEdit({ ...doctor });
        setShowEditDoctorForm(true);
    };

    const handleUpdateDoctor = () => {
        if (!doctorToEdit.name || !doctorToEdit.email || !doctorToEdit.phone) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const nameParts = doctorToEdit.name.split(" ");
        let initials = "";
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        } else {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }

        const updatedDoctors = doctors.map(doc =>
            doc.id === doctorToEdit.id
                ? { ...doctorToEdit, initials: initials }
                : doc
        );

        setDoctors(updatedDoctors);
        setShowEditDoctorForm(false);
        setDoctorToEdit(null);
        setSuccessMessage(`${doctorToEdit.name} a été modifié avec succès`);
        setTimeout(() => setSuccessMessage(""), 3000);

        addActivity(`${doctorToEdit.name} a été modifié`, "edit");
    };

    const handleDeleteDoctor = (doctorId) => {
        const doctorToDelete = doctors.find(d => d.id === doctorId);
        setDeleteConfirmation(doctorToDelete);
    };

    const confirmDelete = () => {
        if (deleteConfirmation) {
            setIsDeleting(true);

            setTimeout(() => {
                const updatedDoctors = doctors.filter(d => d.id !== deleteConfirmation.id);
                setDoctors(updatedDoctors);

                setSuccessMessage(`${deleteConfirmation.name} a été supprimé avec succès`);
                setTimeout(() => setSuccessMessage(""), 3000);

                addActivity(`${deleteConfirmation.name} a été supprimé`, "delete");

                setDeleteConfirmation(null);
                setIsDeleting(false);
            }, 1000);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmation(null);
    };

    const cancelEdit = () => {
        setShowEditDoctorForm(false);
        setDoctorToEdit(null);
    };

    return (
        <div className="space-y-8">
            {successMessage && (
                <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Administrateur</h1>
                <p className="text-gray-500 mt-2">Vue d'ensemble de la plateforme hospitalière</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mockStats.map((stat) => (
                    <Card key={stat.id}
                        onClick={() =>
                            setActiveSection(
                                activeSection === stat.id ? null : stat.id
                            )
                        }
                        className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                                <div className="flex items-center mt-1 gap-2">
                                    {stat.trend === 'up' && (<ArrowUp className="w-4 h-4 text-green-500" />)}
                                    <p className="text-sm text-gray-500">
                                        {stat.subtext}
                                    </p>
                                </div>
                            </div>
                            <div className={`p-4 rounded-full ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {activeSection === "mockdoctors" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Gestion des Médecins</CardTitle>
                            <CardDescription>Ajouter, modifier ou supprimer des médecins</CardDescription>
                        </div>
                        <Button
                            onClick={() => setShowAddDoctorForm(!showAddDoctorForm)}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {showAddDoctorForm ? "Annuler" : "Ajouter un médecin"}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {doctors.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${doc.color}`}>
                                            {doc.initials}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                                            <p className="text-sm text-gray-500">{doc.specialty}</p>
                                            <div className="flex gap-4 mt-1 text-xs text-gray-400">
                                                <span>{doc.email}</span>
                                                <span>{doc.phone}</span>
                                            </div>
                                            {doc.address && (
                                                <p className="text-xs text-gray-400 mt-1">{doc.address}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${doc.status === 'actif' ? 'text-green-700 bg-green-100' :
                                            doc.status === 'inactif' ? 'text-red-700 bg-red-100' :
                                                'text-orange-700 bg-orange-100'
                                            }`}>
                                            {doc.status}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleEditDoctor(doc)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteDoctor(doc.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {doctors.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun médecin trouvé. Cliquez sur "Ajouter un médecin" pour commencer.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeSection === "patients" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Liste des Patients</CardTitle>
                        <CardDescription>Patients enregistrés</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {patients.map((p) => (
                            <div
                                key={p.id}
                                className="p-4 border rounded-lg flex justify-between"
                            >
                                <span>{p.name}</span>
                                <span className="text-gray-500">{p.age} ans</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {activeSection === "rdv" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Rendez-vous Aujourd'hui</CardTitle>
                        <CardDescription>Planning du jour</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {rdvs.map((r) => (
                            <div
                                key={r.id}
                                className="p-4 border rounded-lg flex justify-between"
                            >
                                <span>{r.patient}</span>
                                <span>{r.doctor}</span>
                                <span className="text-gray-500">{r.time}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {activeSection === "system" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Statistiques Système</CardTitle>
                        <CardDescription>État global de la plateforme</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-4 border rounded-lg flex justify-between">
                            <span>Performance Serveur</span>
                            <span>98%</span>
                        </div>
                        <div className="p-4 border rounded-lg flex justify-between">
                            <span>Base de données</span>
                            <span>Stable</span>
                        </div>
                        <div className="p-4 border rounded-lg flex justify-between">
                            <span>Temps de réponse moyen</span>
                            <span>120ms</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Médecins actifs</CardTitle>
                                <CardDescription>Aperçu des praticiens de l'hôpital</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowAllDoctors(!showAllDoctors)}
                                >
                                    {showAllDoctors ? "Réduire" : "Voir tout"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddDoctorForm(true)}
                                    className="gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {displayedDoctors.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${doc.color}`}>
                                            {doc.initials}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                                            <p className="text-sm text-gray-500">{doc.specialty}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${doc.status === 'actif' ? 'text-green-700 bg-green-100' :
                                            doc.status === 'inactif' ? 'text-red-700 bg-red-100' :
                                                'text-orange-700 bg-orange-100'
                                            }`}>
                                            {doc.status}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleEditDoctor(doc)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteDoctor(doc.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Activités récentes</CardTitle>
                            <CardDescription>Événements et modifications système</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {activities.map((activity, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="mt-1">
                                            <div className={`w-2 h-2 rounded-full ring-4 ${activity.type === 'add' ? 'bg-green-500 ring-green-100' :
                                                activity.type === 'edit' ? 'bg-blue-500 ring-blue-100' :
                                                    activity.type === 'delete' ? 'bg-red-500 ring-red-100' :
                                                        'bg-gray-500 ring-gray-100'
                                                }`}></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions rapides</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                onClick={() => setShowAddDoctorForm(true)}
                            >
                                <UserPlus className="w-4 h-4" />
                                Ajouter un médecin
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                onClick={() => setShowDoctorsList(!showDoctorsList)}
                            >
                                <Users className="w-4 h-4" />
                                Gérer les médecins
                            </Button>
                            {showDoctorsList && (
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle>Liste complète des médecins</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {doctors.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${doc.color}`}>
                                                            {doc.initials}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</h4>
                                                            <p className="text-sm text-gray-500 truncate" title={doc.specialty}>{doc.specialty}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shrink-0 ${doc.status === 'actif' ? 'text-green-700 bg-green-100' :
                                                        doc.status === 'inactif' ? 'text-red-700 bg-red-100' : 'text-orange-700 bg-orange-100'}`}>
                                                        {doc.status}
                                                    </span>
                                                </div>

                                                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-100">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2.5 truncate" title={doc.email}>
                                                            <span className="text-gray-400 text-xs">📧</span>
                                                            <span className="truncate">{doc.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 truncate">
                                                            <span className="text-gray-400 text-xs">📞</span>
                                                            <span className="truncate">{doc.phone}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 divide-x divide-gray-200 pt-3 mt-3 border-t border-gray-200">
                                                        <div className="px-2 text-center">
                                                            <span className="block text-lg font-bold text-blue-600">{doc.patients}</span>
                                                            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Patients</span>
                                                        </div>
                                                        <div className="px-2 text-center">
                                                            <span className="block text-lg font-bold text-purple-600">{doc.consultations}</span>
                                                            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Actes</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 mt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3 rounded-md"
                                                        onClick={() => handleEditDoctor(doc)}
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        <span className="text-xs font-medium">Modifier</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3 rounded-md"
                                                        onClick={() => handleDeleteDoctor(doc.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        <span className="text-xs font-medium">Supprimer</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                onClick={() => setShowReportsList(!showReportsList)}
                            >
                                <FileText className="w-4 h-4" />
                                Rapports & Statistiques
                            </Button>
                            {showReportsList && (
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle>Rapports des patients</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {mockReports.map((report, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                                            >
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{report.patient}</h4>
                                                    <p className="text-sm text-gray-500">{report.consultation} - {report.date}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0 text-sm text-gray-600 text-right">
                                                    <p>Ordonnances: {report.ordonnance}</p>
                                                    <p>Documents: {report.documents}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                onClick={() => setShowSystemSurveillance(!showSystemSurveillance)}
                            >
                                <Activity className="w-4 h-4" />
                                Surveillance système
                            </Button>

                            {showSystemSurveillance && (
                                <Card className="mt-4">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Surveillance Système</CardTitle>
                                            <CardDescription>
                                                Dernière mise à jour: {lastRefreshTime.toLocaleTimeString()}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                            className="gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                            {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Utilisation CPU</span>
                                                <span className="font-medium text-gray-900">{surveillanceData.cpu}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${surveillanceData.cpu > 80 ? 'bg-red-600' :
                                                        surveillanceData.cpu > 60 ? 'bg-yellow-600' : 'bg-blue-600'
                                                        }`}
                                                    style={{ width: `${surveillanceData.cpu}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Utilisation Mémoire</span>
                                                <span className="font-medium text-gray-900">
                                                    {surveillanceData.memory.used} GB / {surveillanceData.memory.total} GB
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${(surveillanceData.memory.used / surveillanceData.memory.total) * 100 > 80 ? 'bg-red-600' :
                                                        (surveillanceData.memory.used / surveillanceData.memory.total) * 100 > 60 ? 'bg-yellow-600' : 'bg-green-600'
                                                        }`}
                                                    style={{ width: `${(surveillanceData.memory.used / surveillanceData.memory.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Espace Disque</span>
                                                <span className="font-medium text-gray-900">
                                                    {surveillanceData.disk.used} GB / {surveillanceData.disk.total} GB
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${(surveillanceData.disk.used / surveillanceData.disk.total) * 100 > 85 ? 'bg-red-600' :
                                                        (surveillanceData.disk.used / surveillanceData.disk.total) * 100 > 70 ? 'bg-yellow-600' : 'bg-purple-600'
                                                        }`}
                                                    style={{ width: `${(surveillanceData.disk.used / surveillanceData.disk.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="font-medium text-gray-900 mb-3">État des services</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Base de données</span>
                                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.database)}`}>
                                                        {getServiceStatusIcon(surveillanceData.services.database)}
                                                        {surveillanceData.services.database === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">API REST</span>
                                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.api)}`}>
                                                        {getServiceStatusIcon(surveillanceData.services.api)}
                                                        {surveillanceData.services.api === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Service d'authentification</span>
                                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.auth)}`}>
                                                        {getServiceStatusIcon(surveillanceData.services.auth)}
                                                        {surveillanceData.services.auth === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Service de notifications</span>
                                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.notifications)}`}>
                                                        {getServiceStatusIcon(surveillanceData.services.notifications)}
                                                        {surveillanceData.services.notifications === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="font-medium text-gray-900 mb-3">Métriques de performance</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500">Temps de réponse</p>
                                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.responseTime}ms</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500">Requêtes/min</p>
                                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.requestsPerMin.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500">Erreurs (24h)</p>
                                                    <p className={`text-lg font-bold ${surveillanceData.errors > 10 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {surveillanceData.errors}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500">Uptime</p>
                                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.uptime}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2"
                                                onClick={handleViewLogs}
                                            >
                                                <FileTextIcon className="w-4 h-4" />
                                                {showLogs ? 'Masquer les logs' : 'Voir les logs'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2"
                                                onClick={handleViewAlerts}
                                            >
                                                <Bell className="w-4 h-4" />
                                                {showAlerts ? 'Masquer les alertes' : 'Alertes'}
                                            </Button>
                                        </div>

                                        {showLogs && (
                                            <div className="mt-4 pt-4 border-t">
                                                <h4 className="font-medium text-gray-900 mb-3">Logs système</h4>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {mockLogs.map((log, index) => (
                                                        <div key={index} className="p-2 bg-gray-50 rounded text-xs font-mono">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-gray-400 whitespace-nowrap">{log.timestamp}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${log.level === 'error' ? 'bg-red-100 text-red-700' :
                                                                    log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {log.level}
                                                                </span>
                                                                <span className="text-gray-700">{log.message}</span>
                                                            </div>
                                                            {(log.user || log.ip || log.size || log.endpoint) && (
                                                                <div className="mt-1 text-gray-500">
                                                                    {log.user && <span>Utilisateur: {log.user} </span>}
                                                                    {log.ip && <span>IP: {log.ip} </span>}
                                                                    {log.size && <span>Taille: {log.size} </span>}
                                                                    {log.endpoint && <span>Endpoint: {log.endpoint}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {showAlerts && (
                                            <div className="mt-4 pt-4 border-t">
                                                <h4 className="font-medium text-gray-900 mb-3">Alertes actives</h4>
                                                <div className="space-y-2">
                                                    {alerts.filter(a => !a.acknowledged).map((alert) => (
                                                        <div key={alert.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-2">
                                                                    <AlertCircle className={`w-4 h-4 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' :
                                                                        alert.severity === 'medium' ? 'text-orange-600' :
                                                                            'text-yellow-600'
                                                                        }`} />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                                                        <p className="text-xs text-gray-500">{alert.time}</p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() => acknowledgeAlert(alert.id)}
                                                                >
                                                                    Marquer comme lue
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {alerts.filter(a => !a.acknowledged).length === 0 && (
                                                        <p className="text-sm text-gray-500 text-center py-4">
                                                            Aucune alerte active
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle>État du système</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Database className="w-4 h-4" />
                                            Base de données
                                        </div>
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">Opérationnel</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Server className="w-4 h-4" />
                                            API Backend
                                        </div>
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">Opérationnel</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <HardDrive className="w-4 h-4" />
                                            Stockage
                                        </div>
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">65% utilisé</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Clock className="w-4 h-4" />
                                            Dernière sauvegarde
                                        </div>
                                        <span className="text-gray-500 text-xs">Il y a 2h</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-orange-50 border-orange-100">
                                <CardHeader>
                                    <CardTitle className="text-orange-800 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        Alertes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {alerts.filter(a => !a.acknowledged).length > 0 ? (
                                        alerts.filter(a => !a.acknowledged).map(alert => (
                                            <div key={alert.id} className="bg-white p-3 rounded-md border border-orange-100 shadow-sm flex items-start gap-3">
                                                <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-600' : 'text-orange-600'}`} />
                                                <div>
                                                    <p className="text-sm font-medium text-orange-900 leading-tight">{alert.message}</p>
                                                    <p className="text-[10px] text-orange-400 mt-1 uppercase tracking-wider font-bold">{alert.time}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center py-2 text-center">
                                            <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 opacity-50" />
                                            <p className="text-xs font-medium text-green-700">Aucune alerte active</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Statistiques du mois</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Consultations</span>
                                        <span className="font-bold text-gray-900">1,247</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Ordonnances</span>
                                        <span className="font-bold text-gray-900">1,089</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Documents uploadés</span>
                                        <span className="font-bold text-gray-900">456</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Taux satisfaction</span>
                                        <span className="font-bold text-green-600">94%</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {showEditDoctorForm && doctorToEdit && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl shadow-2xl border-none animate-in zoom-in-95 duration-200 overflow-hidden">
                        <CardHeader className="bg-blue-600 text-white relative">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center font-bold text-lg ${doctorToEdit.color}`}>
                                    {doctorToEdit.initials}
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Modifier le médecin</CardTitle>
                                    <CardDescription className="text-blue-100">Modifiez les informations de {doctorToEdit.name}</CardDescription>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={cancelEdit} className="absolute top-4 right-4 text-white hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Nom complet *</label>
                                    <input type="text" value={doctorToEdit.name} onChange={(e) => setDoctorToEdit({ ...doctorToEdit, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">Spécialité *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                                        {specialties.map(specialty => (
                                            <button key={specialty} type="button" onClick={() => setDoctorToEdit({ ...doctorToEdit, specialty })}
                                                className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${doctorToEdit.specialty === specialty ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                                                {specialty}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Email professionnel *</label>
                                    <input type="email" value={doctorToEdit.email} onChange={(e) => setDoctorToEdit({ ...doctorToEdit, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Téléphone *</label>
                                    <input type="tel" value={doctorToEdit.phone} onChange={(e) => setDoctorToEdit({ ...doctorToEdit, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">Adresse du cabinet</label>
                                    <input type="text" value={doctorToEdit.address} onChange={(e) => setDoctorToEdit({ ...doctorToEdit, address: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Numéro de licence</label>
                                    <input type="text" value={doctorToEdit.licenseNumber} onChange={(e) => setDoctorToEdit({ ...doctorToEdit, licenseNumber: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">Statut du compte</label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {[
                                            { id: 'actif', label: 'Actif', activeClass: 'bg-green-600 text-white border-green-600 shadow-md' },
                                            { id: 'inactif', label: 'Inactif', activeClass: 'bg-red-600 text-white border-red-600 shadow-md' },
                                            { id: 'congé', label: 'En congé', activeClass: 'bg-orange-500 text-white border-orange-500 shadow-md' }
                                        ].map((status) => (
                                            <button key={status.id} type="button" onClick={() => setDoctorToEdit({ ...doctorToEdit, status: status.id })}
                                                className={`flex-1 min-w-[100px] h-11 px-4 rounded-xl border-2 transition-all font-semibold text-sm flex items-center justify-center ${doctorToEdit.status === status.id ? status.activeClass : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'}`}>
                                                {status.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-8 justify-end">
                                <Button variant="outline" onClick={cancelEdit} className="px-6 h-11 rounded-xl">Annuler</Button>
                                <Button onClick={handleUpdateDoctor} className="px-8 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 gap-2">
                                    <Save className="w-4 h-4" />
                                    Enregistrer les modifications
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md shadow-2xl border-none animate-in zoom-in-95 duration-200 overflow-hidden">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900">Confirmer la suppression</CardTitle>
                            <CardDescription className="text-gray-500 mt-2">
                                Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-gray-900">{deleteConfirmation.name}</span> ? Cette action est irréversible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${deleteConfirmation.color}`}>
                                        {deleteConfirmation.initials}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">{deleteConfirmation.name}</p>
                                        <p className="text-xs text-gray-500">{deleteConfirmation.specialty}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                <Button variant="outline" onClick={cancelDelete} disabled={isDeleting} className="sm:flex-1 h-11 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">Annuler</Button>
                                <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="sm:flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 font-medium flex items-center justify-center gap-2">
                                    {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {isDeleting ? "Suppression..." : "Supprimer"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showAddDoctorForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-300">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        <Plus className="w-6 h-6" />
                                        Nouveau médecin
                                    </CardTitle>
                                    <CardDescription className="text-blue-100 mt-1">Remplissez les informations pour ajouter un nouveau praticien</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setShowAddDoctorForm(false)} className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0">
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 max-h-[75vh] overflow-y-auto">
                            <form onSubmit={(e) => { e.preventDefault(); handleAddDoctor(); }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Nom complet *</label>
                                        <input type="text" value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Dr. Jean Dupont" required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Spécialité *</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                                            {specialties.map(specialty => (
                                                <button key={specialty} type="button" onClick={() => setNewDoctor({ ...newDoctor, specialty })}
                                                    className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${newDoctor.specialty === specialty ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                                                    {specialty}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Email *</label>
                                        <input type="email" value={newDoctor.email} onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="jean.dupont@hopital.com" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Téléphone *</label>
                                        <input type="tel" value={newDoctor.phone} onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="+216 91 234 567" required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Adresse du cabinet</label>
                                        <input type="text" value={newDoctor.address} onChange={(e) => setNewDoctor({ ...newDoctor, address: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="15 Rue de la Paix, Tunis" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Numéro de licence</label>
                                        <input type="text" value={newDoctor.licenseNumber} onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="CN-12345" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Statut du compte</label>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {[
                                                { id: 'actif', label: 'Actif', activeClass: 'bg-green-600 text-white border-green-600 shadow-md' },
                                                { id: 'inactif', label: 'Inactif', activeClass: 'bg-red-600 text-white border-red-600 shadow-md' },
                                                { id: 'congé', label: 'En congé', activeClass: 'bg-orange-500 text-white border-orange-500 shadow-md' }
                                            ].map((status) => (
                                                <button key={status.id} type="button" onClick={() => setNewDoctor({ ...newDoctor, status: status.id })}
                                                    className={`flex-1 min-w-[100px] h-11 px-4 rounded-xl border-2 transition-all font-semibold text-sm flex items-center justify-center ${newDoctor.status === status.id ? status.activeClass : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'}`}>
                                                    {status.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-8 justify-end">
                                    <Button type="button" variant="outline" onClick={() => setShowAddDoctorForm(false)} className="px-6 h-11 rounded-xl">Annuler</Button>
                                    <Button type="submit" className="px-8 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-semibold flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Enregistrer le médecin
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}