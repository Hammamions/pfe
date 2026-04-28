import {
    AlertCircle,
    Brain,
    Check,
    ChevronDown,
    Copy,
    FileText,
    Mic,
    MicOff,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, cn } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { aiSuggestions } from '../../data/doctorMockData';
import api from '../../lib/api';

const PRESCRIPTION_QUEUE_KEY = 'hospital_ai_prescription_queue';

export default function AIAssistantPage() {
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [summary, setSummary] = useState('');
    const [copied, setCopied] = useState(false);
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [sendSuccessNote, setSendSuccessNote] = useState('');
    const [diagFeedback, setDiagFeedback] = useState(null);
    const sendSuccessTimerRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const [voiceBanner, setVoiceBanner] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryRagSources, setSummaryRagSources] = useState([]);
    const [clinicalInput, setClinicalInput] = useState('');
    const [diagLoading, setDiagLoading] = useState(false);
    const [diagApiError, setDiagApiError] = useState('');
    const [llmDiagnoses, setLlmDiagnoses] = useState(null);
    const [llmTreatments, setLlmTreatments] = useState(null);
    const [diagRagSources, setDiagRagSources] = useState([]);
    const [useStaticDiagDemo, setUseStaticDiagDemo] = useState(false);
    const [assistantTab, setAssistantTab] = useState('voice');

    useEffect(() => {
        let mounted = true;
        const fetchPatients = async () => {
            try {
                const { data } = await api.get('/professionals/doctor-waiting-room', {
                    params: { _t: Date.now() }
                });
                if (!mounted) return;
                const uniq = new Map();
                (Array.isArray(data) ? data : []).forEach((row) => {
                    if (!row?.patientId || uniq.has(String(row.patientId))) return;
                    uniq.set(String(row.patientId), {
                        id: String(row.patientId),
                        label: `${row.patient?.prenom || ''} ${row.patient?.nom || ''}`.trim() || `Patient #${row.patientId}`
                    });
                });
                const list = Array.from(uniq.values());
                setPatients(list);
            } catch (e) {
                console.error('AI assistant patients fetch error:', e);
                if (mounted) setPatients([]);
            }
        };
        fetchPatients();
        const intervalId = setInterval(fetchPatients, 12000);
        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        setSelectedPatientId((prev) => {
            if (!patients.length) return '';
            if (prev && patients.some((p) => p.id === prev)) return prev;
            return patients[0].id;
        });
    }, [patients]);

    useEffect(() => {
        return () => {
            if (sendSuccessTimerRef.current) clearTimeout(sendSuccessTimerRef.current);
            try {
                speechRecognitionRef.current?.abort();
            } catch {
            }
            speechRecognitionRef.current = null;
        };
    }, []);

    const selectedPatientLabel = useMemo(
        () => patients.find((p) => p.id === selectedPatientId)?.label || 'Aucun patient',
        [patients, selectedPatientId]
    );

    useEffect(() => {
        setDiagFeedback(null);
    }, [selectedPatientId]);

    const appendTreatmentToPrescription = (treatment) => {
        if (!selectedPatientId) {
            setDiagFeedback({
                type: 'error',
                text: 'Sélectionnez d’abord un patient dans la liste « Patient destinataire ».'
            });
            return;
        }
        try {
            let payload = { patientId: selectedPatientId, meds: [] };
            const raw = sessionStorage.getItem(PRESCRIPTION_QUEUE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (String(parsed.patientId) === String(selectedPatientId) && Array.isArray(parsed.meds)) {
                    payload = parsed;
                }
            }
            payload.meds.push({
                nom: treatment.medicament,
                dosage: treatment.dosage,
                frequence: treatment.frequence,
                duree: treatment.duree,
                instructions: treatment.indication ? `Indication : ${treatment.indication}` : ''
            });
            sessionStorage.setItem(PRESCRIPTION_QUEUE_KEY, JSON.stringify(payload));
            setDiagFeedback({
                type: 'success',
                text: `${treatment.medicament} ajouté à l’ordonnance en cours. Ouvrez « Ordonnances » pour vérifier et enregistrer.`
            });
        } catch {
            setDiagFeedback({ type: 'error', text: 'Impossible d’ajouter le médicament (stockage local).' });
        }
    };

    const patientSelectBlock = (
        <div className="space-y-3 rounded-xl border border-indigo-100/90 bg-gradient-to-b from-slate-50/95 to-white p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <UserRound className="h-4 w-4 text-indigo-600/85" />
                Patient destinataire
            </label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="min-h-11" disabled={patients.length === 0}>
                    <span
                        className={cn(
                            'min-w-0 flex-1 truncate text-left text-sm',
                            selectedPatientId ? 'font-semibold text-gray-900' : 'text-gray-500'
                        )}
                    >
                        {patients.length === 0
                            ? 'Aucun patient disponible'
                            : selectedPatientId
                                ? selectedPatientLabel
                                : 'Sélectionner un patient'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                </SelectTrigger>
                <SelectContent>
                    {patients.length === 0 ? (
                        <div className="px-4 py-5 text-center text-sm leading-relaxed text-gray-500">
                            Aucun patient dans la salle d&apos;attente pour aujourd&apos;hui.
                        </div>
                    ) : (
                        patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                <div className="flex min-w-0 flex-col gap-0.5">
                                    <span className="truncate font-semibold text-gray-900">{p.label}</span>
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-600/90">
                                        Dossier patient n° {p.id}
                                    </span>
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
                Patient sélectionné :{' '}
                <span className="font-semibold text-indigo-950">{selectedPatientLabel}</span>
            </p>
        </div>
    );

    const stopVoiceRecognition = () => {
        try {
            speechRecognitionRef.current?.stop();
        } catch {
            try {
                speechRecognitionRef.current?.abort();
            } catch {
            }
        }
        speechRecognitionRef.current = null;
        setIsRecording(false);
    };

    const getSpeechRecognitionCtor = () =>
        typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition);

    const handleToggleVoiceRecording = () => {
        if (isRecording) {
            stopVoiceRecognition();
            return;
        }

        if (typeof window !== 'undefined' && window.isSecureContext === false) {
            setVoiceBanner(
                'Le micro est souvent bloqué sans HTTPS : ouvrez le site en https:// ou sur http://localhost (pas une IP type http://172…).'
            );
            return;
        }

        const SR = getSpeechRecognitionCtor();
        if (!SR) {
            setVoiceBanner(
                'Ce navigateur ne supporte pas la reconnaissance vocale intégrée. Utilisez Chrome ou Edge, ou saisissez le texte au clavier.'
            );
            return;
        }

        setVoiceBanner('');
        const rec = new SR();
        rec.lang = 'fr-FR';
        rec.continuous = true;
        rec.interimResults = true;

        const prefix = transcription.trim() ? `${transcription.trim()}\n` : '';
        let sessionCommitted = '';

        rec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const piece = event.results[i][0]?.transcript ?? '';
                if (event.results[i].isFinal) sessionCommitted += piece;
                else interim += piece;
            }
            setTranscription(prefix + sessionCommitted + interim);
        };

        rec.onerror = (ev) => {
            if (ev.error === 'not-allowed') {
                setVoiceBanner(
                    'Micro refusé : dans la barre d’adresse, autorisez le microphone pour ce site puis réessayez.'
                );
            } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
                setVoiceBanner(`Reconnaissance vocale : ${ev.error}`);
            }
            try {
                rec.abort();
            } catch {
            }
        };

        rec.onend = () => {
            speechRecognitionRef.current = null;
            setIsRecording(false);
        };

        try {
            rec.start();
            speechRecognitionRef.current = rec;
            setIsRecording(true);
        } catch {
            setVoiceBanner('Impossible de démarrer l’écoute. Fermez les autres onglets utilisant le micro et réessayez.');
        }
    };

    const handleGenerateSummary = async () => {
        if (!transcription.trim()) return;

        setSummaryLoading(true);
        setActionError('');
        setSummary('');
        setSummaryRagSources([]);

        try {
            const { data } = await api.post('/professionals/assistant/summary', {
                notes: transcription
            });
            setSummary(data.summary || '');
            setSummaryRagSources(Array.isArray(data.ragSources) ? data.ragSources : []);
        } catch (e) {
            const msg =
                e?.response?.data?.error ||
                e?.message ||
                'Impossible de générer le résumé (vérifiez LLM_API_KEY sur le serveur).';
            setActionError(msg);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleRunDiagnosticIa = async () => {
        const text = (clinicalInput || transcription || '').trim();
        if (!text) {
            setDiagApiError('Saisissez des symptômes ou importez les notes de consultation.');
            return;
        }

        setDiagApiError('');
        setDiagLoading(true);
        setUseStaticDiagDemo(false);
        setLlmDiagnoses(null);
        setLlmTreatments(null);
        setDiagRagSources([]);
        try {
            // 2. FIX THIS URL: Must start with /professionals
            const { data } = await api.post('/professionals/assistant/diagnostic', {
                clinicalText: text
            });
            setLlmDiagnoses(Array.isArray(data.diagnoses) ? data.diagnoses : []);
            setLlmTreatments(Array.isArray(data.treatments) ? data.treatments : []);
            setDiagRagSources(Array.isArray(data.ragSources) ? data.ragSources : []);
        } catch (e) {
            const msg =
                e?.response?.data?.error ||
                e?.message ||
                'Erreur lors de l’analyse IA.';
            setDiagApiError(msg);
        } finally {
            setDiagLoading(false);
        }
    };

    const handleLoadStaticDiagDemo = () => {
        setDiagApiError('');
        setUseStaticDiagDemo(true);
        setLlmDiagnoses(null);
        setLlmTreatments(null);
        setDiagRagSources([]);
    };

    const displayDiagnoses =
        llmDiagnoses && llmDiagnoses.length
            ? llmDiagnoses
            : useStaticDiagDemo
                ? aiSuggestions.diagnoses
                : [];
    const displayTreatments =
        llmTreatments && llmTreatments.length
            ? llmTreatments
            : useStaticDiagDemo
                ? aiSuggestions.treatments
                : [];

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveReport = async (sendSecure) => {
        if (!summary.trim()) return;
        if (!selectedPatientId) {
            setActionError('Sélectionnez un patient avant de continuer.');
            return;
        }
        try {
            setActionBusy(true);
            setActionError('');
            setSendSuccessNote('');
            if (sendSuccessTimerRef.current) {
                clearTimeout(sendSuccessTimerRef.current);
                sendSuccessTimerRef.current = null;
            }
            const { data } = await api.post(
                '/professionals/consultation-reports',
                {
                    patientId: Number(selectedPatientId),
                    summary,
                    sendSecure: sendSecure === true
                },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (sendSecure === true) {
                setSendSuccessNote(
                    'Envoi réussi : le patient reçoit une notification et le PDF apparaît sous Documents (synchro en quelques secondes).'
                );
                sendSuccessTimerRef.current = setTimeout(() => {
                    setSendSuccessNote('');
                    sendSuccessTimerRef.current = null;
                }, 120000);
            }
        } catch (e) {
            const msg = e?.response?.data?.error || 'Erreur lors de la sauvegarde du compte rendu.';
            setActionError(msg);
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Assistant IA</h1>
                <p className="text-gray-600 mt-1">
                    Reconnaissance vocale, résumés automatiques et suggestions diagnostiques
                </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Important</p>
                        <p>
                            L'assistant IA est un outil d'aide à la décision. Le médecin doit
                            toujours valider et vérifier les suggestions avant toute action médicale.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs
                className="w-full"
                defaultValue="voice"
                value={assistantTab}
                onValueChange={setAssistantTab}
            >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="voice">
                        <Mic className="w-4 h-4 mr-2" />
                        Reconnaissance vocale
                    </TabsTrigger>
                    <TabsTrigger value="summary">
                        <FileText className="w-4 h-4 mr-2" />
                        Résumé automatique
                    </TabsTrigger>
                    <TabsTrigger value="diagnosis">
                        <Brain className="w-4 h-4 mr-2" />
                        Suggestion diagnostic
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="voice" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reconnaissance vocale</CardTitle>
                            <CardDescription>
                                Parlez et le système transformera vos paroles en texte
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-8">
                                <button
                                    type="button"
                                    aria-pressed={isRecording}
                                    aria-label={isRecording ? 'Arrêter la dictée' : 'Démarrer la dictée'}
                                    onClick={() => handleToggleVoiceRecording()}
                                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording
                                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {isRecording ? (
                                        <MicOff className="w-12 h-12 text-white" />
                                    ) : (
                                        <Mic className="w-12 h-12 text-white" />
                                    )}
                                </button>
                                <p className="mt-4 text-sm text-gray-600">
                                    {isRecording
                                        ? 'Enregistrement en cours... Cliquez pour arrêter'
                                        : 'Cliquez sur le microphone pour commencer'}
                                </p>
                                {isRecording && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                        <span className="text-sm text-red-600 font-medium">
                                            Écoute en cours — parlez en français
                                        </span>
                                    </div>
                                )}
                            </div>

                            {voiceBanner ? (
                                <div
                                    role="status"
                                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                                >
                                    {voiceBanner}
                                </div>
                            ) : null}

                            {transcription && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-900">
                                            Transcription
                                        </label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(transcription)}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Copié
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copier
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={transcription}
                                        onChange={(e) => setTranscription(e.target.value)}
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        type="button"
                                        className="w-full"
                                        variant="secondary"
                                        disabled={!transcription.trim()}
                                        onClick={() => setAssistantTab('summary')}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Passer au résumé automatique
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Génération de résumé</CardTitle>
                            <CardDescription>
                                Compte rendu structuré à partir des notes (dictée ou saisie), enrichi par la base
                                documentaire (RAG) et le modèle configuré sur le serveur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-900 mb-2 block">
                                    Notes de consultation (brut)
                                </label>
                                <Textarea
                                    value={transcription}
                                    onChange={(e) => setTranscription(e.target.value)}
                                    rows={8}
                                    placeholder="Collez ou complétez les notes issues de l’onglet reconnaissance vocale…"
                                />
                            </div>

                            <Button
                                onClick={() => void handleGenerateSummary()}
                                disabled={!transcription.trim() || summaryLoading}
                                className="w-full"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                {summaryLoading ? 'Génération en cours…' : 'Générer le compte rendu (IA + RAG)'}
                            </Button>

                            {actionError ? (
                                <div
                                    role="alert"
                                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                                >
                                    {actionError}
                                </div>
                            ) : null}

                            {summaryRagSources.length > 0 && (
                                <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                    <summary className="cursor-pointer font-medium text-slate-900">
                                        Sources documentaires utilisées (RAG)
                                    </summary>
                                    <ul className="mt-2 list-disc space-y-2 pl-4">
                                        {summaryRagSources.map((s, i) => (
                                            <li key={i}>
                                                <span className="font-semibold">{s.file}</span>
                                                <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">
                                                    {s.excerpt}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            )}

                            {summary && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-900">
                                            Compte rendu généré
                                        </label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(summary)}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Copié
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copier
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <Textarea
                                        readOnly
                                        value={summary}
                                        rows={12}
                                        className="resize-y border-green-200 bg-green-50 text-sm text-gray-900 selection:bg-green-200"
                                        spellCheck={false}
                                    />
                                    {patientSelectBlock}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            disabled={actionBusy || !summary.trim() || !selectedPatientId}
                                            onClick={() => void handleSaveReport(false)}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Sauvegarder dans le dossier
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            disabled={actionBusy || !summary.trim() || !selectedPatientId}
                                            onClick={() => void handleSaveReport(true)}
                                        >
                                            {actionBusy ? 'Envoi…' : 'Envoyer au patient'}
                                        </Button>
                                    </div>
                                    {sendSuccessNote ? (
                                        <div
                                            role="status"
                                            className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                                        >
                                            <p>{sendSuccessNote}</p>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="diagnosis" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Suggestions diagnostiques</CardTitle>
                            <CardDescription>
                                Basées sur les symptômes et l'historique du patient — les médicaments proposés peuvent être
                                ajoutés à l’ordonnance du patient sélectionné.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {patientSelectBlock}
                            {diagFeedback ? (
                                <div
                                    className={`rounded-md border px-3 py-2 text-sm ${diagFeedback.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                        : 'border-red-200 bg-red-50 text-red-900'
                                        }`}
                                >
                                    <p>{diagFeedback.text}</p>
                                    {diagFeedback.type === 'success' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => navigate('/doctor/prescriptions')}
                                        >
                                            Ouvrir Ordonnances
                                        </Button>
                                    ) : null}
                                </div>
                            ) : null}
                            <div>
                                <label className="text-sm font-medium text-gray-900 mb-2 block">
                                    Symptômes / notes pour l’analyse
                                </label>
                                <Textarea
                                    value={clinicalInput}
                                    onChange={(e) => setClinicalInput(e.target.value)}
                                    rows={5}
                                    placeholder="Décrivez les symptômes, ou importez les notes de l’onglet vocal…"
                                    className="mb-2"
                                />
                                <div className="mb-3 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!transcription.trim()}
                                        onClick={() => setClinicalInput(transcription)}
                                    >
                                        Importer les notes (vocales)
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-indigo-600 outline-none text-white hover:bg-indigo-700"
                                        size="sm"
                                        disabled={diagLoading}
                                        onClick={() => void handleRunDiagnosticIa(true)}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {diagLoading ? 'Analyse...' : 'Analyser (IA simulée)'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleLoadStaticDiagDemo}
                                    >
                                        Exemple statique direct
                                    </Button>
                                </div>
                                {diagApiError ? (
                                    <div
                                        role="alert"
                                        className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                                    >
                                        {diagApiError}
                                    </div>
                                ) : null}
                                <label className="text-sm font-medium text-gray-900 mb-2 block">
                                    Raccourcis (cliquer pour ajouter)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {aiSuggestions.symptoms.map((symptom) => (
                                        <Badge
                                            key={symptom}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-blue-100"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                setClinicalInput((prev) =>
                                                    prev ? `${prev}, ${symptom}` : symptom
                                                )
                                            }
                                            onKeyDown={(ev) => {
                                                if (ev.key === 'Enter' || ev.key === ' ') {
                                                    ev.preventDefault();
                                                    setClinicalInput((prev) =>
                                                        prev ? `${prev}, ${symptom}` : symptom
                                                    );
                                                }
                                            }}
                                        >
                                            {symptom}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {diagRagSources.length > 0 ? (
                                <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                    <summary className="cursor-pointer font-medium text-slate-900">
                                        Sources documentaires (RAG)
                                    </summary>
                                    <ul className="mt-2 list-disc space-y-2 pl-4">
                                        {diagRagSources.map((s, i) => (
                                            <li key={i}>
                                                <span className="font-semibold">{s.file}</span>
                                                <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">
                                                    {s.excerpt}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ) : null}

                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Diagnostics suggérés
                                    {useStaticDiagDemo && !llmDiagnoses?.length ? (
                                        <span className="ml-2 text-xs font-normal text-gray-500">
                                            (démonstration statique)
                                        </span>
                                    ) : null}
                                    {llmDiagnoses?.length ? (
                                        <span className="ml-2 text-xs font-normal text-indigo-600">
                                            (IA)
                                        </span>
                                    ) : null}
                                </h3>
                                {!displayDiagnoses.length ? (
                                    <p className="text-sm text-gray-600">
                                        Lancez l’analyse IA ou chargez l’exemple statique pour afficher des
                                        hypothèses.
                                    </p>
                                ) : null}
                                <div className="space-y-3">
                                    {displayDiagnoses.map((diagnosis, idx) => (
                                        <Card key={idx} className="border-l-4 border-l-blue-600">
                                            <CardContent className="pt-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900">
                                                                {diagnosis.nom}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="text-sm text-gray-600">
                                                                    Probabilité:
                                                                </span>
                                                                <Progress
                                                                    value={diagnosis.probabilite}
                                                                    className="flex-1 max-w-[200px]"
                                                                />
                                                                <span className="text-sm font-semibold text-blue-600">
                                                                    {diagnosis.probabilite}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                diagnosis.probabilite > 70
                                                                    ? 'default'
                                                                    : diagnosis.probabilite > 50
                                                                        ? 'secondary'
                                                                        : 'outline'
                                                            }
                                                        >
                                                            {diagnosis.probabilite > 70
                                                                ? 'Élevée'
                                                                : diagnosis.probabilite > 50
                                                                    ? 'Moyenne'
                                                                    : 'Faible'}
                                                        </Badge>
                                                    </div>

                                                    <div>
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            Critères correspondants:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {diagnosis.criteres.map((critere, i) => (
                                                                <Badge key={i} variant="outline" className="text-xs">
                                                                    {critere}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Traitements suggérés
                                </h3>
                                {!displayTreatments.length ? (
                                    <p className="text-sm text-gray-600">Aucune proposition à afficher.</p>
                                ) : null}
                                <div className="space-y-3">
                                    {displayTreatments.map((treatment, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-lg border border-gray-200 bg-white"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900">
                                                        {treatment.medicament}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Dosage:</span>
                                                            <span className="ml-1 font-medium">
                                                                {treatment.dosage}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Fréquence:</span>
                                                            <span className="ml-1 font-medium">
                                                                {treatment.frequence}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Durée:</span>
                                                            <span className="ml-1 font-medium">
                                                                {treatment.duree}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Indication: {treatment.indication}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => appendTreatmentToPrescription(treatment)}
                                                >
                                                    Ajouter à l’ordonnance
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-amber-900">
                                        <p className="font-semibold mb-1">Validation médicale requise</p>
                                        <p>
                                            Ces suggestions sont générées par IA et doivent être
                                            validées par le médecin avant toute prescription ou
                                            diagnostic final.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
