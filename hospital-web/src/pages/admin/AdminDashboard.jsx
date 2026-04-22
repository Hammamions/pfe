import {
    Activity,
    ArrowUp,
    Calendar,
    CheckCircle2,
    Edit,
    Plus,
    RefreshCw,
    Save,
    Shield,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';


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
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(null);
    const [showAllDoctors, setShowAllDoctors] = useState(false);
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
    const [doctorsLoadError, setDoctorsLoadError] = useState("");

    const [subAdmins, setSubAdmins] = useState([]);
    const [isLoadingSubAdmins, setIsLoadingSubAdmins] = useState(false);
    const [showAddSubAdminForm, setShowAddSubAdminForm] = useState(false);
    const [showEditSubAdminForm, setShowEditSubAdminForm] = useState(false);
    const [subAdminToEdit, setSubAdminToEdit] = useState(null);
    const [newSubAdmin, setNewSubAdmin] = useState({
        name: "",
        email: "",
        specialty: "Cardiologie",
        phone: "",
        status: "actif"
    });
    const [showAllSubAdmins, setShowAllSubAdmins] = useState(false);
    const [selectedSubAdminSpecialty, setSelectedSubAdminSpecialty] = useState(null);

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

    const [patientsList, setPatientsList] = useState([]);
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [overviewStats, setOverviewStats] = useState({
        patientsCount: 0,
        doctorsCount: 0,
        subAdminsCount: 0,
        appointmentsTodayCount: 0,
        appointmentsPendingCount: 0
    });
    const [activities, setActivities] = useState([]);

    const addActivity = (text, type) => {
        const newActivity = {
            text,
            time: "À l'instant",
            type
        };
        setActivities(prev => [newActivity, ...prev]);
    };

    const mapSystemLogToActivity = (log) => {
        const logLevel = String(log?.level || '').toLowerCase();
        const type = logLevel === 'warning' ? 'edit' : 'add';
        const time = log?.time
            || (log?.timestamp
                ? new Date(log.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                : 'Récemment');
        return {
            text: log?.message || 'Événement système',
            time,
            type
        };
    };

    const refreshDoctors = async () => {
        try {
            setIsLoadingDoctors(true);
            setDoctorsLoadError("");
            const res = await api.get('/admin/doctors');
            setDoctors(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load doctors:', err);
            setDoctorsLoadError("Impossible de charger la liste des médecins.");
        } finally {
            setIsLoadingDoctors(false);
        }
    };

    const refreshSubAdmins = async () => {
        try {
            setIsLoadingSubAdmins(true);
            const res = await api.get('/admin/subadmins');
            setSubAdmins(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load sub-admins:', err);
        } finally {
            setIsLoadingSubAdmins(false);
        }
    };

    const refreshPatients = async () => {
        try {
            const res = await api.get('/admin/patients');
            setPatientsList(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load patients:', err);
        }
    };

    const refreshTodayAppointments = async () => {
        try {
            const res = await api.get('/admin/appointments');
            setTodayAppointments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load today appointments:', err);
        }
    };

    const fetchOverviewStats = async () => {
        const response = await api.get('/admin/overview');
        const payload = response?.data ?? {};
        setOverviewStats({
            patientsCount: Number(payload.patientsCount ?? 0),
            doctorsCount: Number(payload.doctorsCount ?? 0),
            subAdminsCount: Number(payload.subAdminsCount ?? 0),
            appointmentsTodayCount: Number(payload.appointmentsTodayCount ?? 0),
            appointmentsPendingCount: Number(payload.appointmentsPendingCount ?? 0)
        });
    };

    useEffect(() => {
        refreshDoctors();
        refreshSubAdmins();
        refreshPatients();
        refreshTodayAppointments();
        fetchSystemLogs().catch((err) => {
            console.error('Failed to fetch system logs:', err);
        });
        fetchOverviewStats().catch((err) => {
            console.error('Failed to fetch overview stats:', err);
        });
    }, []);

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

    const fetchSurveillanceData = async () => {
        const surveillanceResponse = await api.get('/admin/system-surveillance');
        const payload = surveillanceResponse?.data ?? {};
        setSurveillanceData((prev) => ({
            ...prev,
            ...payload,
            memory: {
                used: Number(payload?.memory?.used ?? prev.memory.used),
                total: Number(payload?.memory?.total ?? prev.memory.total)
            },
            disk: {
                used: Number(payload?.disk?.used ?? prev.disk.used),
                total: Number(payload?.disk?.total ?? prev.disk.total)
            }
        }));
    };

    const fetchSystemLogs = async () => {
        const response = await api.get('/admin/system-logs');
        const logs = Array.isArray(response?.data) ? response.data : [];
        setActivities((prev) => (prev.length > 0 ? prev : logs.slice(0, 8).map(mapSystemLogToActivity)));
    };

    useEffect(() => {
        fetchSurveillanceData().catch((err) => {
            console.error('Failed to fetch system surveillance data:', err);
        });
    }, []);

    const canonicalSpecialtyLabelByKey = {
        dermatology: 'dermatology'
    };
    const normalizeSpecialtyKey = (value) => {
        const s = String(value || '').trim();
        if (!s) return '';
        const normalized = s
            .toLowerCase()
            .replace(/\s+/g, ' ');
        if (normalized === 'dermetology') return 'dermatology';
        const compact = s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[\s_-]+/g, '');
        if (
            compact === 'generaliste' ||
            compact === 'medecinegenerale' ||
            compact === 'generalpractitioner'
        ) {
            return 'médecine générale';
        }
        return normalized;
    };
    const normalizeSpecialtyLabel = (value) => {
        const key = normalizeSpecialtyKey(value);
        if (key === 'médecine générale') return 'Médecine générale';
        if (canonicalSpecialtyLabelByKey[key]) return canonicalSpecialtyLabelByKey[key];
        return String(value || '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    const uniqueDoctorSpecialties = [...new Set(doctors.map(doc => doc.specialty).filter(Boolean))];
    const subAdminSpecialtyGroups = Object.values(
        subAdmins.reduce((acc, admin) => {
            const key = normalizeSpecialtyKey(admin.specialty);
            if (!key) return acc;
            if (!acc[key]) {
                acc[key] = {
                    key,
                    label: normalizeSpecialtyLabel(admin.specialty),
                    admins: []
                };
            }
            acc[key].admins.push(admin);
            return acc;
        }, {})
    );
    const uniqueSubAdminSpecialties = subAdminSpecialtyGroups.map((group) => group.key);
    const subAdminSpecialtyLabelByKey = subAdminSpecialtyGroups.reduce((acc, group) => {
        acc[group.key] = group.label;
        return acc;
    }, {});

    const getDoctorsBySpecialty = (specialty) => {
        return doctors.filter(doc => doc.specialty === specialty && doc.status === 'actif');
    };

    const getActiveDoctorsBySpecialty = () => {
        const grouped = {};
        doctors.forEach(doc => {
            if (doc.status === 'actif') {
                if (!grouped[doc.specialty]) {
                    grouped[doc.specialty] = [];
                }
                grouped[doc.specialty].push(doc);
            }
        });
        return grouped;
    };

    const getSubAdminsBySpecialty = () => {
        const grouped = {};
        subAdminSpecialtyGroups.forEach(group => {
            grouped[group.label] = group.admins;
        });
        return grouped;
    };

    const activeDoctorsBySpecialty = getActiveDoctorsBySpecialty();
    const subAdminsBySpecialty = getSubAdminsBySpecialty();
    const activeSubAdminCount = subAdmins.filter(a => a.status === 'actif').length;
    const totalSubAdminCount = subAdmins.length;

    const handleViewAllDoctors = () => {
        setShowAllDoctors(!showAllDoctors);
        if (!showAllDoctors) {
            setSelectedSpecialty(null);
        }
    };

    const handleSpecialtyClick = (specialty) => {
        setSelectedSpecialty(selectedSpecialty === specialty ? null : specialty);
    };

    const displayedDoctors = showAllDoctors && !selectedSpecialty ? doctors : (selectedSpecialty ? doctors.filter(doc => doc.specialty === selectedSpecialty) : doctors.slice(0, 3));

    const handleAddSubAdmin = async () => {
        if (!newSubAdmin.name || !newSubAdmin.email || !newSubAdmin.phone || !newSubAdmin.specialty) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const adminName = newSubAdmin.name;
        try {
            await api.post('/admin/subadmins', {
                name: newSubAdmin.name,
                email: newSubAdmin.email,
                specialty: newSubAdmin.specialty,
                phone: newSubAdmin.phone,
                permissions: [],
                status: newSubAdmin.status
            });

            await refreshSubAdmins();

            setNewSubAdmin({
                name: "",
                email: "",
                specialty: "Cardiologie",
                phone: "",
                status: "actif"
            });
            setShowAddSubAdminForm(false);
            setSuccessMessage(`${adminName} a été ajouté comme secrétaire pour ${newSubAdmin.specialty}`);
            setTimeout(() => setSuccessMessage(""), 3000);
            addActivity(`${adminName} a été ajouté comme secrétaire (${newSubAdmin.specialty})`, "add");
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || "Erreur lors de l'ajout du secrétaire");
        }
    };

    const handleEditSubAdmin = (admin) => {
        setSubAdminToEdit({ ...admin });
        setShowEditSubAdminForm(true);
    };

    const handleUpdateSubAdmin = async () => {
        if (!subAdminToEdit.name || !subAdminToEdit.email || !subAdminToEdit.phone || !subAdminToEdit.specialty) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const adminName = subAdminToEdit.name;
        try {
            await api.put(`/admin/subadmins/${subAdminToEdit.utilisateurId}`, {
                name: subAdminToEdit.name,
                email: subAdminToEdit.email,
                specialty: subAdminToEdit.specialty,
                phone: subAdminToEdit.phone,
                status: subAdminToEdit.status
            });

            await refreshSubAdmins();

            setShowEditSubAdminForm(false);
            setSubAdminToEdit(null);
            setSuccessMessage(`${adminName} a été modifié avec succès`);
            setTimeout(() => setSuccessMessage(""), 3000);
            addActivity(`${adminName} a été modifié`, "edit");
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || "Erreur lors de la modification du secrétaire");
        }
    };

    const handleDeleteSubAdmin = async (adminId) => {
        const adminToDelete = subAdmins.find(a => a.id === adminId);
        if (!adminToDelete) return;
        if (confirm(`Êtes-vous sûr de vouloir supprimer ${adminToDelete.name} ?`)) {
            try {
                await api.delete(`/admin/subadmins/${adminToDelete.utilisateurId}`);
                await refreshSubAdmins();
                setSuccessMessage(`${adminToDelete.name} a été supprimé`);
                setTimeout(() => setSuccessMessage(""), 3000);
                addActivity(`${adminToDelete.name} a été supprimé`, "delete");
            } catch (err) {
                console.error(err);
                alert(err?.response?.data?.error || "Erreur lors de la suppression du secrétaire");
            }
        }
    };

    const totalDoctorsCount = overviewStats.doctorsCount || doctors.length;
    const totalSubAdmins = overviewStats.subAdminsCount || totalSubAdminCount;
    const systemOperational = surveillanceData.services.database === 'operational'
        && surveillanceData.services.api === 'operational'
        && surveillanceData.services.auth === 'operational';

    const updatedStats = [
        {
            id: "mockdoctors",
            title: " total des Médecins",
            value: totalDoctorsCount.toLocaleString(),
            subtext: `sur ${totalDoctorsCount.toLocaleString()} total`,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-100"
        },
        {
            id: "patients",
            title: "Patients inscrits",
            value: overviewStats.patientsCount.toLocaleString(),
            subtext: "Total enregistrés",
            icon: UserPlus,
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            id: "rdv",
            title: "RDV aujourd'hui",
            value: overviewStats.appointmentsTodayCount.toLocaleString(),
            subtext:
                overviewStats.appointmentsPendingCount > 0
                    ? `${overviewStats.appointmentsPendingCount} en attente`
                    : "Planifiés",
            icon: Calendar,
            color: "text-green-600",
            bg: "bg-green-100"
        },
        {
            id: "subadmins",
            title: "Secrétaires",
            value: totalSubAdmins.toLocaleString(),
            subtext: `${activeSubAdminCount} actifs sur ${totalSubAdmins} total`,
            icon: Shield,
            color: "text-indigo-600",
            bg: "bg-indigo-100"
        },
        {
            id: "system",
            title: "Activité système",
            value: `${surveillanceData.uptime}%`,
            subtext: systemOperational ? "Opérationnel" : "Charge élevée",
            icon: Activity,
            color: "text-orange-600",
            bg: "bg-orange-100"
        }
    ];

    const handleAddDoctor = async () => {
        const isActif = newDoctor.status === 'actif';
        const isValid =
            !!newDoctor.name &&
            !!newDoctor.email &&
            !!newDoctor.specialty &&
            (isActif
                ? !!newDoctor.phone && !!newDoctor.address && !!newDoctor.licenseNumber
                : true);

        if (!isValid) {
            alert("Veuillez remplir les champs obligatoires (tous si le statut est Actif)");
            return;
        }

        const doctorName = newDoctor.name;
        try {
            const payload = {
                name: newDoctor.name,
                specialty: newDoctor.specialty,
                status: newDoctor.status,
                email: newDoctor.email,
                phone: isActif ? newDoctor.phone : '',
                address: isActif ? newDoctor.address : '',
                licenseNumber: isActif ? newDoctor.licenseNumber : ''
            };

            await api.post('/admin/doctors', {
                ...payload
            });

            await refreshDoctors();

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
            setSuccessMessage(`${doctorName} a été ajouté avec succès`);
            setTimeout(() => setSuccessMessage(""), 3000);
            addActivity(`${doctorName} a été ajouté`, "add");
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || "Erreur lors de l'ajout du médecin");
        }
    };

    const handleEditDoctor = (doctor) => {
        setDoctorToEdit({ ...doctor });
        setShowEditDoctorForm(true);
    };

    const handleUpdateDoctor = async () => {
        const isActif = doctorToEdit.status === 'actif';
        const isValid =
            !!doctorToEdit.name &&
            !!doctorToEdit.email &&
            !!doctorToEdit.specialty &&
            (isActif
                ? !!doctorToEdit.phone && !!doctorToEdit.address && !!doctorToEdit.licenseNumber
                : true);

        if (!isValid) {
            alert("Veuillez remplir les champs obligatoires (tous si le statut est Actif)");
            return;
        }

        const doctorName = doctorToEdit.name;
        try {
            const shouldClear = doctorToEdit.status === 'inactif';
            const payload = {
                name: doctorToEdit.name,
                specialty: doctorToEdit.specialty,
                status: doctorToEdit.status,
                email: doctorToEdit.email,
                phone: shouldClear ? '' : doctorToEdit.phone,
                address: shouldClear ? '' : doctorToEdit.address,
                licenseNumber: shouldClear ? '' : doctorToEdit.licenseNumber
            };

            await api.put(`/admin/doctors/${doctorToEdit.id}`, {
                ...payload
            });

            await refreshDoctors();

            setShowEditDoctorForm(false);
            setDoctorToEdit(null);
            setSuccessMessage(`${doctorName} a été modifié avec succès`);
            setTimeout(() => setSuccessMessage(""), 3000);
            addActivity(`${doctorName} a été modifié`, "edit");
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || "Erreur lors de la modification du médecin");
        }
    };

    const handleDeleteDoctor = (doctorId) => {
        const doctorToDelete = doctors.find(d => d.id === doctorId);
        setDeleteConfirmation(doctorToDelete);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;
        setIsDeleting(true);
        try {
            const doctorName = deleteConfirmation.name;
            await api.delete(`/admin/doctors/${deleteConfirmation.id}`);
            await refreshDoctors();

            setSuccessMessage(`${doctorName} a été supprimé avec succès`);
            setTimeout(() => setSuccessMessage(""), 3000);
            addActivity(`${doctorName} a été supprimé`, "delete");
            setDeleteConfirmation(null);
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || "Erreur lors de la suppression du médecin");
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmation(null);
    };

    const cancelEdit = () => {
        setShowEditDoctorForm(false);
        setDoctorToEdit(null);
    };

    const getDoctorsTitle = () => {
        if (showAllDoctors) {
            if (selectedSpecialty) {
                return `Médecins actifs - ${selectedSpecialty}`;
            }
            return "Médecins actifs - Toutes spécialités";
        }
        return "Médecins actifs";
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {updatedStats.map((stat) => (
                    <Card key={stat.id}
                        onClick={() => {
                            if (stat.id === 'system') {
                                navigate('/admin/system');
                                return;
                            }
                            setActiveSection(activeSection === stat.id ? null : stat.id);
                        }}
                        className="border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
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
                <Card className="border-gray-200 shadow-sm">
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
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Liste des Patients</CardTitle>
                        <CardDescription>Patients enregistrés</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {patientsList.map((p) => (
                            <div
                                key={p.id}
                                className="p-4 border rounded-lg"
                            >
                                <span>{`${p.prenom || ''} ${p.nom || ''}`.trim() || p.email}</span>
                            </div>
                        ))}
                        {patientsList.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-3">Aucun patient trouvé</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeSection === "rdv" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Rendez-vous Aujourd'hui</CardTitle>
                        <CardDescription>Planning du jour</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {todayAppointments.map((r) => (
                            <div
                                key={r.id}
                                className="p-4 border rounded-lg flex justify-between"
                            >
                                <span>{r.patientName || '-'}</span>
                                <span>{r.doctor || 'Non assigné'}</span>
                                <span className="text-gray-500">{r.time}</span>
                            </div>
                        ))}
                        {todayAppointments.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-3">Aucun rendez-vous aujourd'hui</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeSection === "subadmins" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Gestion des secrétaires</CardTitle>
                            <CardDescription>Gérer les secrétaires par spécialité</CardDescription>
                        </div>
                        <Button
                            onClick={() => setShowAddSubAdminForm(true)}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter un secrétaire
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {subAdmins.map((admin) => (
                                <div
                                    key={admin.id}
                                    className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{admin.name}</h4>
                                            <p className="text-sm text-gray-500">{admin.specialty}</p>
                                            <div className="flex gap-4 mt-1 text-xs text-gray-400">
                                                <span>{admin.email}</span>
                                                <span>{admin.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${admin.status === 'actif' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                            {admin.status}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleEditSubAdmin(admin)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteSubAdmin(admin.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {subAdmins.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun secrétaire trouvé. Cliquez sur « Ajouter un secrétaire » pour commencer.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{getDoctorsTitle()}</CardTitle>
                                <CardDescription>
                                    {showAllDoctors
                                        ? "Liste complète des praticiens par spécialité"
                                        : "Aperçu des praticiens de l'hôpital"}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleViewAllDoctors}
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
                            {isLoadingDoctors && (
                                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    Chargement des médecins...
                                </div>
                            )}

                            {!isLoadingDoctors && doctorsLoadError && (
                                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
                                    <span>{doctorsLoadError}</span>
                                    <Button size="sm" variant="outline" onClick={refreshDoctors}>
                                        Réessayer
                                    </Button>
                                </div>
                            )}

                            {!isLoadingDoctors && !doctorsLoadError && doctors.length === 0 && (
                                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 text-center">
                                    Aucun médecin trouvé. Cliquez sur "Ajouter" pour créer le premier compte.
                                </div>
                            )}

                            {!isLoadingDoctors && !doctorsLoadError && doctors.length > 0 && (
                                <>
                                    {showAllDoctors && (
                                        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                                            <Button
                                                variant={selectedSpecialty === null ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedSpecialty(null)}
                                                className="text-xs"
                                            >
                                                Toutes les spécialités
                                            </Button>
                                            {uniqueDoctorSpecialties.map(specialty => (
                                                <Button
                                                    key={specialty}
                                                    variant={selectedSpecialty === specialty ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleSpecialtyClick(specialty)}
                                                    className="text-xs"
                                                >
                                                    {specialty} ({getDoctorsBySpecialty(specialty).length})
                                                </Button>
                                            ))}
                                        </div>
                                    )}

                                    {showAllDoctors && !selectedSpecialty && (
                                        <div className="space-y-6">
                                            {Object.keys(activeDoctorsBySpecialty).length === 0 && (
                                                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 text-center">
                                                    Aucun médecin actif pour le moment.
                                                </div>
                                            )}
                                            {Object.entries(activeDoctorsBySpecialty).map(([specialty, specialtyDoctors]) => (
                                                <div key={specialty} className="space-y-3">
                                                    <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-500 pl-3">
                                                        {specialty} ({specialtyDoctors.length})
                                                    </h3>
                                                    <div className="space-y-3 pl-4">
                                                        {specialtyDoctors.map((doc) => (
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
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showAllDoctors && selectedSpecialty && (
                                        <div className="space-y-3">
                                            <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-500 pl-3">
                                                {selectedSpecialty} ({getDoctorsBySpecialty(selectedSpecialty).length})
                                            </h3>
                                            {getDoctorsBySpecialty(selectedSpecialty).length === 0 && (
                                                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 text-center">
                                                    Aucun médecin actif dans cette spécialité.
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                {getDoctorsBySpecialty(selectedSpecialty).map((doc) => (
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
                                            </div>
                                        </div>
                                    )}

                                    {!showAllDoctors && (
                                        <div className="space-y-3">
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
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-600" />
                                    Secrétaires par spécialité
                                </CardTitle>
                                <CardDescription>
                                    Gestion des comptes secrétaires pour chaque spécialité médicale
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowAllSubAdmins(!showAllSubAdmins)}
                                >
                                    {showAllSubAdmins ? "Réduire" : "Voir tout"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddSubAdminForm(true)}
                                    className="gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {showAllSubAdmins && (
                                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                                    <Button
                                        variant={selectedSubAdminSpecialty === null ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedSubAdminSpecialty(null)}
                                        className="text-xs"
                                    >
                                        Toutes les spécialités
                                    </Button>
                                    {uniqueSubAdminSpecialties.map(specialtyKey => (
                                        <Button
                                            key={specialtyKey}
                                            variant={selectedSubAdminSpecialty === specialtyKey ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedSubAdminSpecialty(specialtyKey)}
                                            className="text-xs"
                                        >
                                            {subAdminSpecialtyLabelByKey[specialtyKey] || specialtyKey} ({subAdmins.filter(a => normalizeSpecialtyKey(a.specialty) === specialtyKey).length})
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {showAllSubAdmins && !selectedSubAdminSpecialty && (
                                <div className="space-y-6">
                                    {Object.entries(subAdminsBySpecialty).map(([specialty, admins]) => (
                                        <div key={specialty} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-md font-semibold text-gray-800 border-l-4 border-indigo-500 pl-3">
                                                    {specialty}
                                                </h3>
                                                <span className="text-xs text-gray-500">{admins.length} secrétaire(s)</span>
                                            </div>
                                            <div className="space-y-3 pl-4">
                                                {admins.map((admin) => (
                                                    <div key={admin.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center">
                                                                <ShieldCheck className="w-5 h-5 text-indigo-700" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{admin.name}</h4>
                                                                <p className="text-sm text-gray-500">{admin.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${admin.status === 'actif' ? 'text-green-700 bg-green-100' : admin.status === 'congé' ? 'text-orange-700 bg-orange-100' : 'text-red-700 bg-red-100'}`}>
                                                                {admin.status}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => handleEditSubAdmin(admin)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteSubAdmin(admin.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(subAdminsBySpecialty).length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            Aucun secrétaire. Cliquez sur « Ajouter » pour commencer.
                                        </div>
                                    )}
                                </div>
                            )}

                            {showAllSubAdmins && selectedSubAdminSpecialty && (
                                <div className="space-y-3">
                                    <h3 className="text-md font-semibold text-gray-800 border-l-4 border-indigo-500 pl-3">
                                        {subAdminSpecialtyLabelByKey[selectedSubAdminSpecialty] || selectedSubAdminSpecialty}
                                    </h3>
                                    <div className="space-y-3">
                                        {subAdmins.filter(a => normalizeSpecialtyKey(a.specialty) === selectedSubAdminSpecialty).map((admin) => (
                                            <div key={admin.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center">
                                                        <ShieldCheck className="w-5 h-5 text-indigo-700" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{admin.name}</h4>
                                                        <p className="text-sm text-gray-500">{admin.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${admin.status === 'actif' ? 'text-green-700 bg-green-100' : admin.status === 'congé' ? 'text-orange-700 bg-orange-100' : 'text-red-700 bg-red-100'}`}>
                                                        {admin.status}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleEditSubAdmin(admin)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteSubAdmin(admin.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!showAllSubAdmins && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {uniqueSubAdminSpecialties.map(specialtyKey => {
                                        const adminCount = subAdmins.filter(a => normalizeSpecialtyKey(a.specialty) === specialtyKey && a.status === 'actif').length;
                                        const totalForSpecialty = subAdmins.filter(a => normalizeSpecialtyKey(a.specialty) === specialtyKey).length;
                                        return (
                                            <div key={specialtyKey} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => {
                                                setShowAllSubAdmins(true);
                                                setSelectedSubAdminSpecialty(specialtyKey);
                                            }}>
                                                <Shield className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                                                <p className="text-sm font-medium text-gray-700">{subAdminSpecialtyLabelByKey[specialtyKey] || specialtyKey}</p>
                                                <p className="text-xs text-gray-500">{adminCount}/{totalForSpecialty} actif(s)</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                <div className="space-y-8">
                    <Card className="border-gray-200 shadow-sm">
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
                                onClick={() => setShowAddSubAdminForm(true)}
                            >
                                <Shield className="w-4 h-4" />
                                Ajouter un secrétaire
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                onClick={() => navigate('/admin/system')}
                            >
                                <Activity className="w-4 h-4" />
                                Surveillance &amp; système
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {showAddSubAdminForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-300">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        <Shield className="w-6 h-6" />
                                        Nouveau secrétaire
                                    </CardTitle>
                                    <CardDescription className="text-indigo-100 mt-1">Ajouter un secrétaire par spécialité médicale</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setShowAddSubAdminForm(false)} className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0">
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 max-h-[75vh] overflow-y-auto">
                            <form onSubmit={(e) => { e.preventDefault(); handleAddSubAdmin(); }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Spécialité *</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                                            {specialties.map(specialty => (
                                                <button key={specialty} type="button" onClick={() => setNewSubAdmin({ ...newSubAdmin, specialty })}
                                                    className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${newSubAdmin.specialty === specialty ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg ring-2 ring-indigo-400/80' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50'}`}>
                                                    {specialty}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Nom complet *</label>
                                        <input type="text" value={newSubAdmin.name} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="Admin Jean Dupont" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Email *</label>
                                        <input type="email" value={newSubAdmin.email} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="admin@hopital.com" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Téléphone *</label>
                                        <input type="tel" value={newSubAdmin.phone} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="+216 90 123 456" required />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-8 justify-end">
                                    <Button type="button" variant="outline" onClick={() => setShowAddSubAdminForm(false)} className="px-6 h-11 rounded-xl">Annuler</Button>
                                    <Button type="submit" className="px-8 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-semibold flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Enregistrer le secrétaire
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showEditSubAdminForm && subAdminToEdit && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-300">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6" />
                                        Modifier secrétaire
                                    </CardTitle>
                                    <CardDescription className="text-indigo-100 mt-1">Modifier les informations de {subAdminToEdit.name}</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setShowEditSubAdminForm(false)} className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0">
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 max-h-[75vh] overflow-y-auto">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Spécialité *</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                                            {specialties.map(specialty => (
                                                <button key={specialty} type="button" onClick={() => setSubAdminToEdit({ ...subAdminToEdit, specialty })}
                                                    className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${subAdminToEdit.specialty === specialty ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg ring-2 ring-indigo-400/80' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-indigo-200'}`}>
                                                    {specialty}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Nom complet *</label>
                                        <input type="text" value={subAdminToEdit.name} onChange={(e) => setSubAdminToEdit({ ...subAdminToEdit, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Email *</label>
                                        <input type="email" value={subAdminToEdit.email} onChange={(e) => setSubAdminToEdit({ ...subAdminToEdit, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Téléphone *</label>
                                        <input type="tel" value={subAdminToEdit.phone} onChange={(e) => setSubAdminToEdit({ ...subAdminToEdit, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Statut</label>
                                        <div className="flex gap-2 pt-1">
                                            <button type="button" onClick={() => setSubAdminToEdit({ ...subAdminToEdit, status: "actif" })}
                                                className={`flex-1 h-11 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${subAdminToEdit.status === 'actif' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>
                                                Actif
                                            </button>
                                            <button type="button" onClick={() => setSubAdminToEdit({ ...subAdminToEdit, status: "congé" })}
                                                className={`flex-1 h-11 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${subAdminToEdit.status === 'congé' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>
                                                En congé
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-8 justify-end">
                                    <Button variant="outline" onClick={() => setShowEditSubAdminForm(false)} className="px-6 h-11 rounded-xl">Annuler</Button>
                                    <Button onClick={handleUpdateSubAdmin} className="px-8 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-semibold flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Enregistrer les modifications
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                                                className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${doctorToEdit.specialty === specialty ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/80' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'}`}>
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
                                    <input
                                        type="tel"
                                        value={doctorToEdit.phone}
                                        onChange={(e) => setDoctorToEdit({ ...doctorToEdit, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        required={doctorToEdit.status === 'actif'}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Adresse du cabinet{doctorToEdit.status === 'actif' ? ' *' : ''}
                                    </label>
                                    <input
                                        type="text"
                                        value={doctorToEdit.address}
                                        onChange={(e) => setDoctorToEdit({ ...doctorToEdit, address: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        required={doctorToEdit.status === 'actif'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Numéro de licence{doctorToEdit.status === 'actif' ? ' *' : ''}
                                    </label>
                                    <input
                                        type="text"
                                        value={doctorToEdit.licenseNumber}
                                        onChange={(e) => setDoctorToEdit({ ...doctorToEdit, licenseNumber: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        required={doctorToEdit.status === 'actif'}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">Statut du compte</label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {[
                                            { id: 'actif', label: 'Actif', activeClass: 'bg-green-600 text-white border-green-600 shadow-md' },
                                            { id: 'congé', label: 'En congé', activeClass: 'bg-orange-500 text-white border-orange-500 shadow-md' }
                                        ].map((status) => (
                                            <button
                                                key={status.id}
                                                type="button"
                                                onClick={() => {
                                                    const nextStatus = status.id;
                                                    const shouldClear = nextStatus === 'inactif';
                                                    setDoctorToEdit({
                                                        ...doctorToEdit,
                                                        status: nextStatus,
                                                        ...(shouldClear ? { phone: '', address: '', licenseNumber: '' } : {})
                                                    });
                                                }}
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
                                                    className={`h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center text-center leading-tight ${newDoctor.specialty === specialty ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/80' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'}`}>
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
                                        <input
                                            type="tel"
                                            value={newDoctor.phone}
                                            onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                            placeholder="+216 91 234 567"
                                            required={newDoctor.status === 'actif'}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">
                                            Adresse du cabinet{newDoctor.status === 'actif' ? ' *' : ''}
                                        </label>
                                        <input
                                            type="text"
                                            value={newDoctor.address}
                                            onChange={(e) => setNewDoctor({ ...newDoctor, address: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                            placeholder="15 Rue de la Paix, Tunis"
                                            required={newDoctor.status === 'actif'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">
                                            Numéro de licence{newDoctor.status === 'actif' ? ' *' : ''}
                                        </label>
                                        <input
                                            type="text"
                                            value={newDoctor.licenseNumber}
                                            onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                            placeholder="CN-12345"
                                            required={newDoctor.status === 'actif'}
                                        />
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