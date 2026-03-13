import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Eye,
    FileText,
    Heart,
    Plus,
    Search,
    User
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { mockPatientFiles } from '../../data/doctorMockData';

export default function PatientFilesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showConsultationSent, setShowConsultationSent] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (location.state?.patientName && location.state?.patientPrenom) {
            const foundPatient = mockPatientFiles.find(
                p => p.patient.nom === location.state.patientName &&
                    p.patient.prenom === location.state.patientPrenom
            );
            if (foundPatient) {
                setSelectedPatient(foundPatient);
            }
        }
    }, [location.state]);

    const filteredPatients = mockPatientFiles.filter(
        (patient) =>
            patient.patient.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.patient.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.patient.numeroSecu.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Fiches Patients</h1>
                <p className="text-gray-600 mt-1">
                    Consultez les dossiers médicaux de vos patients
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Rechercher un patient par nom ou numéro de sécurité sociale..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.map((patientFile) => (
                    <Card
                        key={patientFile.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedPatient(patientFile)}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">
                                            {patientFile.patient.prenom} {patientFile.patient.nom}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {patientFile.patient.dateNaissance}
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Heart className="w-4 h-4" />
                                    <span>{patientFile.patient.groupeSanguin}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FileText className="w-4 h-4" />
                                    <span>{patientFile.consultations.length} consultation(s)</span>
                                </div>
                                {patientFile.allergies.length > 0 && (
                                    <div className="flex items-start gap-2 text-red-600">
                                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                                        <span className="text-xs">
                                            {patientFile.allergies.length} allergie(s)
                                        </span>
                                    </div>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPatient(patientFile);
                                }}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir le dossier
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xl">
                                    {selectedPatient?.patient.prenom} {selectedPatient?.patient.nom}
                                </div>
                                <div className="text-sm text-gray-500 font-normal">
                                    {selectedPatient?.patient.dateNaissance}
                                </div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedPatient && (
                        <Tabs defaultValue="info" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="info">Informations</TabsTrigger>
                                <TabsTrigger value="consultations">Consultations</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                                <TabsTrigger value="analyses">Analyses</TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Informations personnelles</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Email</p>
                                            <p className="font-medium">{selectedPatient.patient.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Téléphone</p>
                                            <p className="font-medium">{selectedPatient.patient.telephone}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">N° Sécurité sociale</p>
                                            <p className="font-medium">{selectedPatient.patient.numeroSecu}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Groupe sanguin</p>
                                            <p className="font-medium text-red-600">
                                                {selectedPatient.patient.groupeSanguin}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                            Allergies
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedPatient.allergies.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedPatient.allergies.map((allergie, idx) => (
                                                    <Badge key={idx} variant="destructive">
                                                        {allergie}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Aucune allergie connue</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Antécédents médicaux</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedPatient.antecedents.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedPatient.antecedents.map((antecedent, idx) => (
                                                    <Badge key={idx} variant="secondary">
                                                        {antecedent}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Aucun antécédent enregistré</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="consultations" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900">
                                        Historique des consultations
                                    </h3>
                                    <Button
                                        size="sm"
                                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => setShowConsultationSent(true)}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nouvelle consultation
                                    </Button>
                                </div>

                                {selectedPatient.consultations.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedPatient.consultations.map((consultation) => (
                                            <Card key={consultation.id}>
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <CardTitle className="text-base">
                                                                {consultation.motif}
                                                            </CardTitle>
                                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {new Date(consultation.date).toLocaleDateString('fr-FR')}
                                                            </CardDescription>
                                                        </div>
                                                        <Badge variant="outline">{consultation.medecin}</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <p className="text-gray-600 font-medium">Symptômes</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {consultation.symptomes.map((symptome, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {symptome}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 font-medium">Diagnostic</p>
                                                        <p className="text-gray-900">{consultation.diagnostic}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 font-medium">Traitement</p>
                                                        <p className="text-gray-900">{consultation.traitement}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 font-medium">Notes</p>
                                                        <p className="text-gray-700">{consultation.notes}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card>
                                        <CardContent className="py-12 text-center">
                                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">Aucune consultation enregistrée</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="documents" className="mt-4">
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600">Aucun document disponible</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.png"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    alert("Fonctionnalité d'ajout de document en cours de développement");
                                                }
                                            }}
                                        />
                                        <Button size="sm" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Ajouter un document
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="analyses" className="mt-4">
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600">Aucune analyse disponible</p>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            {showConsultationSent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 rounded-full bg-green-50 ring-8 ring-green-100 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-1">
                            La demande de nouvelle consultation pour
                        </p>
                        <p className="text-blue-600 font-semibold mb-1">
                            {selectedPatient?.patient.prenom} {selectedPatient?.patient.nom}
                        </p>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8">
                            a été envoyée avec succès. Le patient sera notifié dès que possible.
                        </p>

                        <button
                            onClick={() => setShowConsultationSent(false)}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
