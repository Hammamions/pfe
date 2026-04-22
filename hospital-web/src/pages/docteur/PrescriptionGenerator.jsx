import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    Calendar,
    CheckCircle2,
    Download,
    FileText,
    Plus,
    Send,
    Trash2,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

async function sha256HexOfArrayBuffer(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}


async function buildOrdonnancePdfWithQr(opts) {
    const { doctor, patient, medsForPdf, notes, dateStr, qrHex } = opts;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text('ORDONNANCE MÉDICALE', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Dr. ${doctor.prenom} ${doctor.nom}`, 20, 40);
    doc.text(doctor.specialite, 20, 45);
    doc.text(`N° Ordre: ${doctor.numeroOrdre}`, 20, 50);
    if (doctor.telephone) doc.text(doctor.telephone, 20, 55);

    doc.text(`Le ${dateStr}`, 160, 40);

    doc.line(20, 60, 190, 60);

    doc.setFontSize(12);
    doc.text('Patient:', 20, 75);
    doc.setFontSize(10);
    doc.text(`${patient.patient.prenom} ${patient.patient.nom}`, 20, 82);
    doc.text(`Né(e) le: ${patient.patient.dateNaissance}`, 20, 87);
    doc.text(`N° Sécu: ${patient.patient.numeroSecu}`, 20, 92);

    let yPos = 110;
    doc.setFontSize(12);
    doc.text('Prescriptions:', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);

    medsForPdf.forEach((med, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${med.nom} ${med.dosage}`, 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.text(`${med.frequence} pendant ${med.duree}`, 25, yPos);
        yPos += 5;

        if (med.instructions) {
            doc.setFont('helvetica', 'italic');
            doc.text(`Note: ${med.instructions}`, 25, yPos);
            yPos += 5;
        }
        yPos += 5;
    });

    if (notes) {
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Notes et recommandations:', 20, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(notes, 170);
        doc.text(splitNotes, 20, yPos);
        yPos += splitNotes.length * 5;
    }

    yPos = Math.max(yPos + 20, 240);

    const qrSize = 28;
    const qrX = 210 - 18 - qrSize;
    const pngDataUrl = await QRCode.toDataURL(qrHex, {
        width: 160,
        margin: 1,
        errorCorrectionLevel: 'M'
    });

    doc.addImage(pngDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
    doc.setFontSize(5);
    doc.setTextColor(60, 60, 60);
    doc.text(qrHex.substring(0, 32), qrX, yPos + qrSize + 4);
    doc.text(qrHex.substring(32), qrX, yPos + qrSize + 7);

    return doc;
}
const PRESCRIPTION_QUEUE_KEY = 'hospital_ai_prescription_queue';
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
const defaultDoctor = {
    prenom: '',
    nom: '',
    specialite: 'Médecin',
    numeroOrdre: '—',
    telephone: '',
};

const MED_LIMITS = {
    nomMax: 120,
    dosageMax: 60,
    frequenceMax: 80,
    dureeMax: 80,
    instructionsMax: 500,
    notesMax: 2000,
    notesMinAlone: 10,
};

const hasLetter = (s) => /[A-Za-z\u00C0-\u024F]/.test(s);
const hasDigit = (s) => /\d/.test(s);

const emptyMedErrors = () => ({
    nom: '',
    dosage: '',
    frequence: '',
    duree: '',
    instructions: '',
});

export default function PrescriptionGeneratorPage() {
    const [doctor, setDoctor] = useState(defaultDoctor);
    const [patientOptions, setPatientOptions] = useState([]);
    const [loadPatientsError, setLoadPatientsError] = useState('');
    const [sendError, setSendError] = useState('');
    const [saving, setSaving] = useState(false);
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
    const [lastSavedOrdonnanceId, setLastSavedOrdonnanceId] = useState(null);
    const [medFieldErrors, setMedFieldErrors] = useState(emptyMedErrors);
    const [notesError, setNotesError] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('proUser');
            if (!raw) return;
            const u = JSON.parse(raw);
            setDoctor({
                prenom: u.firstName || u.prenom || '',
                nom: u.lastName || u.nom || '',
                specialite: u.specialite || 'Médecin',
                numeroOrdre: u.numeroOrdre || '—',
                telephone: u.telephone || '',
            });
        } catch {
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get('/professionals/prescription-patients');
                if (!cancelled) {
                    setPatientOptions(Array.isArray(data) ? data : []);
                    setLoadPatientsError('');
                }
            } catch (e) {
                if (!cancelled) {
                    setPatientOptions([]);
                    setLoadPatientsError(
                        e.response?.data?.error || 'Impossible de charger la liste des patients.'
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(PRESCRIPTION_QUEUE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            const pid = data?.patientId != null ? String(data.patientId) : '';
            const meds = Array.isArray(data?.meds) ? data.meds : [];
            if (!pid || meds.length === 0) {
                sessionStorage.removeItem(PRESCRIPTION_QUEUE_KEY);
                return;
            }
            setSelectedPatient(pid);
            setMedications((prev) => {
                const next = [...prev];
                for (const m of meds) {
                    const nom = String(m.nom || '').trim();
                    const dosage = String(m.dosage || '').trim();
                    if (!nom) continue;
                    const dup = next.some((x) => x.nom === nom && x.dosage === dosage);
                    if (dup) continue;
                    next.push({
                        nom,
                        dosage,
                        frequence: String(m.frequence || '').trim(),
                        duree: String(m.duree || '').trim(),
                        instructions: String(m.instructions || '').trim()
                    });
                }
                return next;
            });
            sessionStorage.removeItem(PRESCRIPTION_QUEUE_KEY);
        } catch {
            sessionStorage.removeItem(PRESCRIPTION_QUEUE_KEY);
        }
    }, []);

    const validateMedicationLine = (med) => {
        const err = emptyMedErrors();
        const nom = (med.nom || '').trim();
        const dosage = (med.dosage || '').trim();
        const frequence = (med.frequence || '').trim();
        const duree = (med.duree || '').trim();
        const instructions = (med.instructions || '').trim();

        if (nom.length < 2) err.nom = 'Le nom doit contenir au moins 2 caractères.';
        else if (nom.length > MED_LIMITS.nomMax) err.nom = `Maximum ${MED_LIMITS.nomMax} caractères.`;
        else if (!hasLetter(nom)) err.nom = 'Le nom doit inclure au moins une lettre.';

        if (!dosage.length) err.dosage = 'Le dosage est obligatoire.';
        else if (dosage.length > MED_LIMITS.dosageMax) err.dosage = `Maximum ${MED_LIMITS.dosageMax} caractères.`;
        else if (!hasDigit(dosage)) err.dosage = 'Indiquez une valeur chiffrée (ex. 500 mg, 1 g).';

        if (!frequence.length) err.frequence = 'La fréquence est obligatoire (ex. 3×/jour).';
        else if (frequence.length < 2) err.frequence = 'Précisez la fréquence.';
        else if (frequence.length > MED_LIMITS.frequenceMax) err.frequence = `Maximum ${MED_LIMITS.frequenceMax} caractères.`;

        if (!duree.length) err.duree = 'La durée du traitement est obligatoire (ex. 7 jours).';
        else if (duree.length < 2) err.duree = 'Précisez la durée.';
        else if (duree.length > MED_LIMITS.dureeMax) err.duree = `Maximum ${MED_LIMITS.dureeMax} caractères.`;

        if (instructions.length > MED_LIMITS.instructionsMax) {
            err.instructions = `Maximum ${MED_LIMITS.instructionsMax} caractères.`;
        }

        return err;
    };

    const currentMedLineIsPartiallyFilled = () => {
        const m = currentMed;
        return Boolean(
            (m.nom || '').trim() ||
                (m.dosage || '').trim() ||
                (m.frequence || '').trim() ||
                (m.duree || '').trim() ||
                (m.instructions || '').trim()
        );
    };

    const validateNotes = () => {
        const n = notes;
        if (n.length > MED_LIMITS.notesMax) {
            setNotesError(`Les notes ne peuvent pas dépasser ${MED_LIMITS.notesMax} caractères.`);
            return false;
        }
        setNotesError('');
        return true;
    };

    const validateMedicationsInList = (list) => {
        for (const med of list) {
            const e = validateMedicationLine(med);
            if (Object.values(e).some(Boolean)) {
                return { ok: false, message: 'Un médicament dans la liste est incomplet ou invalide.' };
            }
        }
        return { ok: true };
    };

    const getMedicationsForExport = () => {
        const meds = [...medications];
        if (!currentMedLineIsPartiallyFilled()) return meds;
        const e = validateMedicationLine(currentMed);
        if (Object.values(e).some(Boolean)) return meds;
        meds.push({
            nom: currentMed.nom.trim(),
            dosage: currentMed.dosage.trim(),
            frequence: currentMed.frequence.trim(),
            duree: currentMed.duree.trim(),
            instructions: (currentMed.instructions || '').trim(),
        });
        return meds;
    };

    const addMedication = () => {
        const err = validateMedicationLine(currentMed);
        setMedFieldErrors(err);
        if (Object.values(err).some(Boolean)) return;

        setMedications([...medications, {
            nom: currentMed.nom.trim(),
            dosage: currentMed.dosage.trim(),
            frequence: currentMed.frequence.trim(),
            duree: currentMed.duree.trim(),
            instructions: (currentMed.instructions || '').trim(),
        }]);
        setCurrentMed({
            nom: '',
            dosage: '',
            frequence: '',
            duree: '',
            instructions: '',
        });
        setMedFieldErrors(emptyMedErrors());
    };

    const removeMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const generatePDF = () => {
        setFormError('');
        if (!selectedPatient) {
            setFormError('Sélectionnez un patient.');
            return;
        }
        if (!validateNotes()) return;

        if (currentMedLineIsPartiallyFilled()) {
            const err = validateMedicationLine(currentMed);
            setMedFieldErrors(err);
            if (Object.values(err).some(Boolean)) {
                setFormError('Complétez ou corrigez le médicament en cours, ou videz les champs.');
                return;
            }
        } else {
            setMedFieldErrors(emptyMedErrors());
        }

        const extra = currentMedLineIsPartiallyFilled()
            ? [{
                nom: currentMed.nom.trim(),
                dosage: currentMed.dosage.trim(),
                frequence: currentMed.frequence.trim(),
                duree: currentMed.duree.trim(),
                instructions: (currentMed.instructions || '').trim(),
            }]
            : [];

        const allMeds = [...medications, ...extra];
        const listCheck = validateMedicationsInList(allMeds);
        if (!listCheck.ok) {
            setFormError(listCheck.message);
            return;
        }

        if (allMeds.length === 0 && !notes.trim()) {
            setFormError('Ajoutez au moins un médicament ou des notes.');
            return;
        }
        if (allMeds.length === 0 && notes.trim().length < MED_LIMITS.notesMinAlone) {
            setFormError(`Sans médicament, les notes doivent faire au moins ${MED_LIMITS.notesMinAlone} caractères.`);
            return;
        }

        if (extra.length) {
            setMedications(allMeds);
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

    const patient = patientOptions.find((p) => p.id === selectedPatient);

    const handleSendToPatient = async () => {
        setSendError('');
        setFormError('');
        const pid = Number(selectedPatient);
        if (!Number.isFinite(pid) || !patient) {
            setSendError('Sélectionnez un patient.');
            return;
        }
        if (!validateNotes()) {
            setSendError(`Les notes ne peuvent pas dépasser ${MED_LIMITS.notesMax} caractères.`);
            return;
        }

        if (currentMedLineIsPartiallyFilled()) {
            const err = validateMedicationLine(currentMed);
            setMedFieldErrors(err);
            if (Object.values(err).some(Boolean)) {
                setSendError('Complétez le médicament en cours avant enregistrement.');
                return;
            }
        } else {
            setMedFieldErrors(emptyMedErrors());
        }

        const extra = currentMedLineIsPartiallyFilled()
            ? [{
                nom: currentMed.nom.trim(),
                dosage: currentMed.dosage.trim(),
                frequence: currentMed.frequence.trim(),
                duree: currentMed.duree.trim(),
                instructions: (currentMed.instructions || '').trim(),
            }]
            : [];

        const allMeds = [...medications, ...extra];
        const listCheck = validateMedicationsInList(allMeds);
        if (!listCheck.ok) {
            setSendError(listCheck.message);
            return;
        }

        if (allMeds.length === 0 && !notes.trim()) {
            setSendError('Ajoutez au moins un médicament ou des notes.');
            return;
        }
        if (allMeds.length === 0 && notes.trim().length < MED_LIMITS.notesMinAlone) {
            setSendError(`Sans médicament, les notes doivent faire au moins ${MED_LIMITS.notesMinAlone} caractères.`);
            return;
        }

        const contenu = JSON.stringify({
            medications: allMeds,
            notes: notes.trim(),
            issuedAt: new Date().toISOString(),
        });
        setSaving(true);
        try {
            const { data } = await api.post('/professionals/prescriptions', { patientId: pid, contenu });
            if (extra.length) {
                setMedications(allMeds);
                setCurrentMed({
                    nom: '',
                    dosage: '',
                    frequence: '',
                    duree: '',
                    instructions: '',
                });
            }
            setLastSavedOrdonnanceId(
                data && typeof data.id === 'number' ? data.id : null
            );
            setShowSentNotification(true);
            setTimeout(() => setShowSentNotification(false), 5000);
        } catch (e) {
            setSendError(e.response?.data?.error || "Erreur lors de l'enregistrement de l'ordonnance.");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!patient) return;
        setFormError('');

        if (currentMedLineIsPartiallyFilled()) {
            const err = validateMedicationLine(currentMed);
            setMedFieldErrors(err);
            if (Object.values(err).some(Boolean)) {
                setFormError('Complétez le médicament en cours avant export PDF.');
                return;
            }
        }

        const extra = currentMedLineIsPartiallyFilled()
            ? [{
                nom: currentMed.nom.trim(),
                dosage: currentMed.dosage.trim(),
                frequence: currentMed.frequence.trim(),
                duree: currentMed.duree.trim(),
                instructions: (currentMed.instructions || '').trim(),
            }]
            : [];
        const medsForPdf = [...medications, ...extra];

        const date = new Date().toLocaleDateString('fr-FR');
        const seed = JSON.stringify({
            meds: medsForPdf,
            notes: notes.trim(),
            patient: {
                prenom: patient.patient.prenom,
                nom: patient.patient.nom,
                dateNaissance: patient.patient.dateNaissance,
                numeroSecu: patient.patient.numeroSecu,
            },
            doctor: {
                prenom: doctor.prenom,
                nom: doctor.nom,
                specialite: doctor.specialite,
                numeroOrdre: doctor.numeroOrdre,
                telephone: doctor.telephone || '',
            },
            date,
        });
        let h = await sha256HexOfArrayBuffer(new TextEncoder().encode(seed).buffer);
        let lastDoc = null;
        for (let i = 0; i < 48; i++) {
            lastDoc = await buildOrdonnancePdfWithQr({
                doctor,
                patient,
                medsForPdf,
                notes: notes.trim(),
                dateStr: date,
                qrHex: h,
            });
            const out = lastDoc.output('arraybuffer');
            const nh = await sha256HexOfArrayBuffer(out);
            if (nh === h) {
                lastDoc.save(`ordonnance_${patient.patient.nom}_${date}.pdf`);
                return;
            }
            h = nh;
        }
        if (lastDoc) {
            lastDoc.save(`ordonnance_${patient.patient.nom}_${date}.pdf`);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Génération d'ordonnance
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Créez une ordonnance conforme : champs obligatoires et validations avant envoi au patient.
                    </p>
                    {loadPatientsError ? (
                        <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            {loadPatientsError}
                        </p>
                    ) : null}
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
                                            {patientOptions.length === 0 ? (
                                                <SelectItem value="__empty__" disabled>
                                                    Aucun patient — un rendez-vous avec vous est requis
                                                </SelectItem>
                                            ) : (
                                                patientOptions.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.patient.prenom} {p.patient.nom}
                                                        {p.patient.dateNaissance
                                                            ? ` — ${p.patient.dateNaissance}`
                                                            : ''}
                                                    </SelectItem>
                                                ))
                                            )}
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
                                            <Label htmlFor="med-nom">Nom du médicament *</Label>
                                            <Input
                                                id="med-nom"
                                                value={currentMed.nom}
                                                maxLength={MED_LIMITS.nomMax}
                                                className={medFieldErrors.nom ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                                onChange={(e) => {
                                                    setCurrentMed({ ...currentMed, nom: e.target.value });
                                                    if (medFieldErrors.nom) setMedFieldErrors((prev) => ({ ...prev, nom: '' }));
                                                }}
                                                placeholder="Ex: Doliprane"
                                            />
                                            {medFieldErrors.nom ? (
                                                <p className="text-xs text-red-600 mt-1">{medFieldErrors.nom}</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <Label htmlFor="med-dosage">Dosage *</Label>
                                            <Input
                                                id="med-dosage"
                                                value={currentMed.dosage}
                                                maxLength={MED_LIMITS.dosageMax}
                                                className={medFieldErrors.dosage ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                                onChange={(e) => {
                                                    setCurrentMed({ ...currentMed, dosage: e.target.value });
                                                    if (medFieldErrors.dosage) setMedFieldErrors((prev) => ({ ...prev, dosage: '' }));
                                                }}
                                                placeholder="Ex: 500mg"
                                            />
                                            {medFieldErrors.dosage ? (
                                                <p className="text-xs text-red-600 mt-1">{medFieldErrors.dosage}</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <Label htmlFor="med-frequence">Fréquence *</Label>
                                            <Input
                                                id="med-frequence"
                                                value={currentMed.frequence}
                                                maxLength={MED_LIMITS.frequenceMax}
                                                className={medFieldErrors.frequence ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                                onChange={(e) => {
                                                    setCurrentMed({ ...currentMed, frequence: e.target.value });
                                                    if (medFieldErrors.frequence) setMedFieldErrors((prev) => ({ ...prev, frequence: '' }));
                                                }}
                                                placeholder="Ex: 3x/jour"
                                            />
                                            {medFieldErrors.frequence ? (
                                                <p className="text-xs text-red-600 mt-1">{medFieldErrors.frequence}</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <Label htmlFor="med-duree">Durée *</Label>
                                            <Input
                                                id="med-duree"
                                                value={currentMed.duree}
                                                maxLength={MED_LIMITS.dureeMax}
                                                className={medFieldErrors.duree ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                                onChange={(e) => {
                                                    setCurrentMed({ ...currentMed, duree: e.target.value });
                                                    if (medFieldErrors.duree) setMedFieldErrors((prev) => ({ ...prev, duree: '' }));
                                                }}
                                                placeholder="Ex: 7 jours"
                                            />
                                            {medFieldErrors.duree ? (
                                                <p className="text-xs text-red-600 mt-1">{medFieldErrors.duree}</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <Label htmlFor="med-instructions">Instructions (optionnel)</Label>
                                            <Input
                                                id="med-instructions"
                                                value={currentMed.instructions}
                                                maxLength={MED_LIMITS.instructionsMax}
                                                className={medFieldErrors.instructions ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                                onChange={(e) => {
                                                    setCurrentMed({
                                                        ...currentMed,
                                                        instructions: e.target.value,
                                                    });
                                                    if (medFieldErrors.instructions) {
                                                        setMedFieldErrors((prev) => ({ ...prev, instructions: '' }));
                                                    }
                                                }}
                                                placeholder="Ex: Pendant les repas"
                                            />
                                            {medFieldErrors.instructions ? (
                                                <p className="text-xs text-red-600 mt-1">{medFieldErrors.instructions}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={addMedication}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Ajouter le médicament
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes et recommandations (optionnel, max. {MED_LIMITS.notesMax} car.)</Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        maxLength={MED_LIMITS.notesMax}
                                        className={notesError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        onChange={(e) => {
                                            setNotes(e.target.value);
                                            if (notesError) setNotesError('');
                                        }}
                                        rows={4}
                                        placeholder="Ajoutez des notes, recommandations ou instructions supplémentaires..."
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>
                                            {notes.trim().length > 0 && medications.length === 0 && !currentMedLineIsPartiallyFilled()
                                                ? `Sans médicament : minimum ${MED_LIMITS.notesMinAlone} caractères.`
                                                : '\u00A0'}
                                        </span>
                                        <span>{notes.length}/{MED_LIMITS.notesMax}</span>
                                    </div>
                                    {notesError ? (
                                        <p className="text-xs text-red-600">{notesError}</p>
                                    ) : null}
                                </div>

                                {formError ? (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
                                ) : null}

                                <Button
                                    onClick={generatePDF}
                                    disabled={!selectedPatient}
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
                                                    <p className="font-semibold">{doctor.prenom} {doctor.nom}</p>
                                                    <p>{doctor.specialite}</p>
                                                    <p>N° Ordre: {doctor.numeroOrdre}</p>
                                                    {doctor.telephone ? <p>{doctor.telephone}</p> : null}
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
                                                    {getMedicationsForExport().map((med, index) => (
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
                                        </div>

                                        <div className="space-y-2">
                                            <Button className="w-full" onClick={() => void handleDownloadPDF()}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Télécharger PDF
                                            </Button>
                                            {formError ? (
                                                <p className="text-xs text-red-600">{formError}</p>
                                            ) : null}
                                            {sendError ? (
                                                <p className="text-xs text-red-600">{sendError}</p>
                                            ) : null}
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2"
                                                onClick={handleSendToPatient}
                                                disabled={saving}
                                            >
                                                <Send className="w-4 h-4" />
                                                {saving ? 'Enregistrement…' : 'Enregistrer pour le patient'}
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
                                <p className="font-semibold text-sm">Ordonnance enregistrée !</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {patient ? `${patient.patient.prenom} ${patient.patient.nom}` : 'Patient'} verra cette ordonnance dans l’app
                                    {lastSavedOrdonnanceId != null ? ` (réf. n°${lastSavedOrdonnanceId})` : ''}. Vérifiez qu’il s’agit du bon patient.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
