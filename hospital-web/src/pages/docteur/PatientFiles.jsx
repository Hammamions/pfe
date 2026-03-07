import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Search,
    User,
    FileText,
    Calendar,
    Heart,
    AlertTriangle,
    Eye,
    Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { mockPatientFiles } from '../../data/doctorMockData';

export default function PatientFilesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const location = useLocation();

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

            {/* Search */}
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

            {/* Patient List */}
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

            {/* Patient Details Dialog */}
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

                            {/* General Info */}
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

                            {/* Consultations */}
                            <TabsContent value="consultations" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900">
                                        Historique des consultations
                                    </h3>
                                    <Button size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
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

                            {/* Documents */}
                            <TabsContent value="documents" className="mt-4">
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600">Aucun document disponible</p>
                                        <Button size="sm" className="mt-4">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Ajouter un document
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Analyses */}
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
        </div>
    );
}
