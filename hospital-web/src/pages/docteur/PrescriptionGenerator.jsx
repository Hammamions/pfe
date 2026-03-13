import { jsPDF } from 'jspdf';
import {
    Calendar,
    CheckCircle2,
    Download,
    FileText,
    PenTool,
    Plus,
    Send,
    Trash2,
    User
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { mockDoctor, mockPatientFiles } from '../../data/doctorMockData';

export default function PrescriptionGeneratorPage() {
    const [selectedPatient, setSelectedPatient] = useState('');
    const [medications, setMedications] = useState([]);
    const [currentMed, setCurrentMed] = useState({
        nom: '',
        dosage: '',
        frequence: '',
        duree: '',
        instructions: '',
    });
    const [notes, setNotes] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showSentNotification, setShowSentNotification] = useState(false);

    const addMedication = () => {
        if (currentMed.nom && currentMed.dosage) {
            setMedications([...medications, currentMed]);
            setCurrentMed({
                nom: '',
                dosage: '',
                frequence: '',
                duree: '',
                instructions: '',
            });
        }
    };

    const removeMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const generatePDF = () => {
        if (currentMed.nom && currentMed.dosage) {
            setMedications(prev => [...prev, currentMed]);
            setCurrentMed({
                nom: '',
                dosage: '',
                frequence: '',
                duree: '',
                instructions: '',
            });
        }
        setShowPreview(true);
    };

    const patient = mockPatientFiles.find((p) => p.id === selectedPatient);

    const handleSendToPatient = () => {
        setShowSentNotification(true);
        setTimeout(() => setShowSentNotification(false), 3500);
    };

    const handleDownloadPDF = () => {
        if (!patient) return;

        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("ORDONNANCE MÉDICALE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Dr. ${mockDoctor.prenom} ${mockDoctor.nom}`, 20, 40);
        doc.text(mockDoctor.specialite, 20, 45);
        doc.text(`N° Ordre: ${mockDoctor.numeroOrdre}`, 20, 50);
        doc.text(mockDoctor.telephone, 20, 55);

        const date = new Date().toLocaleDateString('fr-FR');
        doc.text(`Le ${date}`, 160, 40);

        doc.line(20, 60, 190, 60);

        doc.setFontSize(12);
        doc.text("Patient:", 20, 75);
        doc.setFontSize(10);
        doc.text(`${patient.patient.prenom} ${patient.patient.nom}`, 20, 82);
        doc.text(`Né(e) le: ${patient.patient.dateNaissance}`, 20, 87);
        doc.text(`N° Sécu: ${patient.patient.numeroSecu}`, 20, 92);

        let yPos = 110;
        doc.setFontSize(12);
        doc.text("Prescriptions:", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);



        const medsToPrint = [...medications];
        if (currentMed.nom && currentMed.dosage && !medsToPrint.find(m => m === currentMed)) {

        }

        medications.forEach((med, index) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${index + 1}. ${med.nom} ${med.dosage}`, 20, yPos);
            yPos += 5;

            doc.setFont("helvetica", "normal");
            doc.text(`${med.frequence} pendant ${med.duree}`, 25, yPos);
            yPos += 5;

            if (med.instructions) {
                doc.setFont("helvetica", "italic");
                doc.text(`Note: ${med.instructions}`, 25, yPos);
                yPos += 5;
            }
            yPos += 5;
        });

        if (notes) {
            yPos += 10;
            doc.setFont("helvetica", "bold");
            doc.text("Notes et recommandations:", 20, yPos);
            yPos += 7;
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(notes, 170);
            doc.text(splitNotes, 20, yPos);
            yPos += splitNotes.length * 5;
        }

        yPos = Math.max(yPos + 20, 240);
        doc.line(120, yPos, 190, yPos);
        doc.text("Signature", 120, yPos + 10);
        doc.text(`Dr. ${mockDoctor.prenom} ${mockDoctor.nom}`, 120, yPos + 15);

        doc.save(`ordonnance_${patient.patient.nom}_${date}.pdf`);
    };

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Génération d'ordonnance
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Créez et signez numériquement vos ordonnances
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Patient
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="patient">Sélectionner un patient</Label>
                                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un patient" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mockPatientFiles.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.patient.prenom} {p.patient.nom} -{' '}
                                                    {p.patient.dateNaissance}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {patient && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
                                            <p>
                                                <span className="font-medium">Email:</span>{' '}
                                                {patient.patient.email}
                                            </p>
                                            <p>
                                                <span className="font-medium">Téléphone:</span>{' '}
                                                {patient.patient.telephone}
                                            </p>
                                            <p>
                                                <span className="font-medium">N° Sécu:</span>{' '}
                                                {patient.patient.numeroSecu}
                                            </p>
                                            {patient.allergies.length > 0 && (
                                                <p className="text-red-600 mt-2">
                                                    <span className="font-medium">⚠️ Allergies:</span>{' '}
                                                    {patient.allergies.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Médicaments prescrits</CardTitle>
                                <CardDescription>Ajoutez les traitements à prescrire</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {medications.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {medications.map((med, index) => (
                                            <div
                                                key={index}
                                                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900">{med.nom}</h4>
                                                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
                                                            <div>
                                                                <span className="font-medium">Dosage:</span> {med.dosage}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Fréquence:</span>{' '}
                                                                {med.frequence}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Durée:</span> {med.duree}
                                                            </div>
                                                        </div>
                                                        {med.instructions && (
                                                            <p className="text-sm text-gray-600 mt-2">
                                                                {med.instructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeMedication(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-4 p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <Label htmlFor="med-nom">Nom du médicament</Label>
                                            <Input
                                                id="med-nom"
                                                value={currentMed.nom}
                                                onChange={(e) =>
                                                    setCurrentMed({ ...currentMed, nom: e.target.value })
                                                }
                                                placeholder="Ex: Doliprane"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="med-dosage">Dosage</Label>
                                            <Input
                                                id="med-dosage"
                                                value={currentMed.dosage}
                                                onChange={(e) =>
                                                    setCurrentMed({ ...currentMed, dosage: e.target.value })
                                                }
                                                placeholder="Ex: 500mg"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="med-frequence">Fréquence</Label>
                                            <Input
                                                id="med-frequence"
                                                value={currentMed.frequence}
                                                onChange={(e) =>
                                                    setCurrentMed({ ...currentMed, frequence: e.target.value })
                                                }
                                                placeholder="Ex: 3x/jour"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="med-duree">Durée</Label>
                                            <Input
                                                id="med-duree"
                                                value={currentMed.duree}
                                                onChange={(e) =>
                                                    setCurrentMed({ ...currentMed, duree: e.target.value })
                                                }
                                                placeholder="Ex: 7 jours"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="med-instructions">Instructions</Label>
                                            <Input
                                                id="med-instructions"
                                                value={currentMed.instructions}
                                                onChange={(e) =>
                                                    setCurrentMed({
                                                        ...currentMed,
                                                        instructions: e.target.value,
                                                    })
                                                }
                                                placeholder="Ex: Pendant les repas"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={addMedication}
                                        variant="outline"
                                        className="w-full"
                                        disabled={!currentMed.nom || !currentMed.dosage}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Ajouter le médicament
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes et recommandations</Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={4}
                                        placeholder="Ajoutez des notes, recommandations ou instructions supplémentaires..."
                                    />
                                </div>

                                <Button
                                    onClick={generatePDF}
                                    disabled={!selectedPatient || (medications.length === 0 && (!currentMed.nom || !currentMed.dosage) && !notes)}
                                    className="w-full"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Générer l'ordonnance PDF
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Aperçu</CardTitle>
                                <CardDescription>Prévisualisation de l'ordonnance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!showPreview ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm">
                                            L'aperçu apparaîtra ici après génération
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border-2 border-gray-200 rounded-lg p-6 bg-white text-sm">
                                            <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                                <h3 className="font-bold text-lg">ORDONNANCE MÉDICALE</h3>
                                                <div className="mt-2 text-xs">
                                                    <p className="font-semibold">{mockDoctor.prenom} {mockDoctor.nom}</p>
                                                    <p>{mockDoctor.specialite}</p>
                                                    <p>N° Ordre: {mockDoctor.numeroOrdre}</p>
                                                    <p>{mockDoctor.telephone}</p>
                                                </div>
                                            </div>

                                            {patient && (
                                                <div className="mb-4 text-xs">
                                                    <p className="font-semibold">Patient:</p>
                                                    <p>
                                                        {patient.patient.prenom} {patient.patient.nom}
                                                    </p>
                                                    <p>Né(e) le: {patient.patient.dateNaissance}</p>
                                                    <p>N° Sécu: {patient.patient.numeroSecu}</p>
                                                </div>
                                            )}

                                            <div className="mb-4 text-xs flex items-center gap-2">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    Le {new Date().toLocaleDateString('fr-FR')}
                                                </span>
                                            </div>

                                            <div className="mb-4">
                                                <div className="space-y-3">
                                                    {medications.map((med, index) => (
                                                        <div key={index} className="text-xs">
                                                            <p className="font-semibold">
                                                                {index + 1}. {med.nom} {med.dosage}
                                                            </p>
                                                            <p className="ml-4">
                                                                {med.frequence} pendant {med.duree}
                                                            </p>
                                                            {med.instructions && (
                                                                <p className="ml-4 text-gray-600 italic">
                                                                    {med.instructions}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {notes && (
                                                <div className="mb-4 text-xs">
                                                    <p className="font-semibold">Notes:</p>
                                                    <p className="whitespace-pre-wrap">{notes}</p>
                                                </div>
                                            )}

                                            <div className="mt-8 pt-4 border-t border-gray-300 text-xs">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <PenTool className="w-4 h-4" />
                                                    <span className="font-semibold">Signature numérique</span>
                                                </div>
                                                <div className="italic text-gray-600">
                                                    Dr. {mockDoctor.prenom} {mockDoctor.nom}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Document signé électroniquement le{' '}
                                                    {new Date().toLocaleString('fr-FR')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Button className="w-full" onClick={handleDownloadPDF}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Télécharger PDF
                                            </Button>
                                            <Button variant="outline" className="w-full gap-2" onClick={handleSendToPatient}>
                                                <Send className="w-4 h-4" />
                                                Envoyer au patient
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {
                showSentNotification && (
                    <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="bg-gray-900 text-white flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Ordonnance envoyée !</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {patient ? `${patient.patient.prenom} ${patient.patient.nom}` : 'Patient'} a été notifié avec succès.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
