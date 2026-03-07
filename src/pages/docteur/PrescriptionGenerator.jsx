import { jsPDF } from 'jspdf';
import { useState } from 'react';
import {
    FileText,
    Plus,
    Download,
    Check,
    User,
    Calendar,
    Trash2,
    PenTool,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
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
        // If there's a medication typed in but not added, add it first
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

    const handleDownloadPDF = () => {
        if (!patient) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text("ORDONNANCE MÉDICALE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Dr. ${mockDoctor.prenom} ${mockDoctor.nom}`, 20, 40);
        doc.text(mockDoctor.specialite, 20, 45);
        doc.text(`N° Ordre: ${mockDoctor.numeroOrdre}`, 20, 50);
        doc.text(mockDoctor.telephone, 20, 55);

        // Date
        const date = new Date().toLocaleDateString('fr-FR');
        doc.text(`Le ${date}`, 160, 40);

        // Line separator
        doc.line(20, 60, 190, 60);

        // Patient Info
        doc.setFontSize(12);
        doc.text("Patient:", 20, 75);
        doc.setFontSize(10);
        doc.text(`${patient.patient.prenom} ${patient.patient.nom}`, 20, 82);
        doc.text(`Né(e) le: ${patient.patient.dateNaissance}`, 20, 87);
        doc.text(`N° Sécu: ${patient.patient.numeroSecu}`, 20, 92);

        // Medications
        let yPos = 110;
        doc.setFontSize(12);
        doc.text("Prescriptions:", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);

        // Use a local variable combined with state for the PDF generation to ensure latest data is used
        // However, since setMedications is async, we might not have the updated state immediately if we just called it.
        // A better approach for the PDF generation is to pass the list to be generated. 
        // But for this simple fix, we will just rely on the user confirming the preview or double clicking? 
        // Actually, the preview is what matters first. The generatePDF shows the PREVIEW.
        // The handleDownloadPDF uses `medications` state. 
        // If we just added it to state in generatePDF, it won't be in `medications` yet for this render cycle?
        // Actually, setShowPreview(true) triggers a re-render. 
        // But wait, the update to medications state via setMedications inside generatePDF won't be reflected in the current render's handleDownloadPDF closure if it was called immediately, 
        // BUT generatePDF only shows the preview. The USER has to click "Télécharger" LATER. 
        // So the state WILL be updated by then. 
        // The issue is: will the PREVIEW show it?
        // The preview renders `medications.map(...)`.
        // If we call setMedications in generatePDF, React schedules a status update.
        // setShowPreview(true) schedules another.
        // React should batch these or handle them such that the next render has both.
        // So the Preview SHOULD be correct.

        // Wait, if I use `currentMed` logic in `generatePDF`, I need to make sure I don't lose that med if the user cancels or something? 
        // User just sees the preview.

        const medsToPrint = [...medications];
        if (currentMed.nom && currentMed.dosage && !medsToPrint.find(m => m === currentMed)) {
            // This logic is tricky because `currentMed` object reference might change or not be in the list yet.
            // Actually, `generatePDF` updates the state. The re-render will show the new list.
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

        // Notes
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

        // Signature
        yPos = Math.max(yPos + 20, 240);
        doc.line(120, yPos, 190, yPos);
        doc.text("Signature", 120, yPos + 10);
        doc.text(`Dr. ${mockDoctor.prenom} ${mockDoctor.nom}`, 120, yPos + 15);

        // Save
        doc.save(`ordonnance_${patient.patient.nom}_${date}.pdf`);
    };

    return (
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
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Patient Selection */}
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

                    {/* Medications */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Médicaments prescrits</CardTitle>
                            <CardDescription>Ajoutez les traitements à prescrire</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Current medications list */}
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

                            {/* Add medication form */}
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

                            {/* Additional Notes */}
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
                                disabled={!selectedPatient || (medications.length === 0 && (!currentMed.nom || !currentMed.dosage))}
                                className="w-full"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Générer l'ordonnance PDF
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
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
                                    {/* PDF Preview */}
                                    <div className="border-2 border-gray-200 rounded-lg p-6 bg-white text-sm">
                                        {/* Header */}
                                        <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                            <h3 className="font-bold text-lg">ORDONNANCE MÉDICALE</h3>
                                            <div className="mt-2 text-xs">
                                                <p className="font-semibold">{mockDoctor.prenom} {mockDoctor.nom}</p>
                                                <p>{mockDoctor.specialite}</p>
                                                <p>N° Ordre: {mockDoctor.numeroOrdre}</p>
                                                <p>{mockDoctor.telephone}</p>
                                            </div>
                                        </div>

                                        {/* Patient Info */}
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

                                        {/* Date */}
                                        <div className="mb-4 text-xs flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                Le {new Date().toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>

                                        {/* Medications */}
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

                                        {/* Notes */}
                                        {notes && (
                                            <div className="mb-4 text-xs">
                                                <p className="font-semibold">Notes:</p>
                                                <p className="whitespace-pre-wrap">{notes}</p>
                                            </div>
                                        )}

                                        {/* Signature */}
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

                                    {/* Actions */}
                                    <div className="space-y-2">
                                        <Button className="w-full" onClick={handleDownloadPDF}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Télécharger PDF
                                        </Button>
                                        <Button variant="outline" className="w-full">
                                            <Check className="w-4 h-4 mr-2" />
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
    );
}
