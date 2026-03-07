import { useState } from 'react';
import {
    Mic,
    MicOff,
    FileText,
    Brain,
    Sparkles,
    Copy,
    Check,
    AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { aiSuggestions } from '../../data/doctorMockData';

export default function AIAssistantPage() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [summary, setSummary] = useState('');
    const [copied, setCopied] = useState(false);

    const handleStartRecording = () => {
        setIsRecording(true);
        // Simulate voice recording
        setTimeout(() => {
            setTranscription(
                'Patient se plaint de douleurs thoraciques depuis 2 jours. Les douleurs sont localisées au niveau du sternum et irradient vers le bras gauche. Intensité 6/10. Aggravation à l\'effort. Patient fumeur, 20 cigarettes par jour depuis 15 ans. Antécédents familiaux de maladies cardiovasculaires. Tension artérielle mesurée à 145/90. Fréquence cardiaque 88 bpm. Patient présente également une dyspnée à l\'effort modéré.'
            );
            setIsRecording(false);
        }, 3000);
    };

    const handleGenerateSummary = () => {
        setSummary(
            '**Consultation du ' +
            new Date().toLocaleDateString('fr-FR') +
            '**\n\n' +
            '**Motif de consultation:** Douleurs thoraciques\n\n' +
            '**Symptômes:**\n' +
            '- Douleurs thoraciques depuis 2 jours\n' +
            '- Localisation: sternum avec irradiation bras gauche\n' +
            '- Intensité: 6/10\n' +
            '- Facteur aggravant: effort physique\n' +
            '- Dyspnée à l\'effort modéré\n\n' +
            '**Examen clinique:**\n' +
            '- TA: 145/90 mmHg\n' +
            '- FC: 88 bpm\n\n' +
            '**Facteurs de risque:**\n' +
            '- Tabagisme actif (20 cig/j depuis 15 ans)\n' +
            '- ATCD familiaux cardiovasculaires\n\n' +
            '**Plan de prise en charge:**\n' +
            '- ECG à réaliser\n' +
            '- Bilan biologique (troponine, D-dimères)\n' +
            '- Consultation cardiologique en urgence\n' +
            '- Arrêt du tabac recommandé'
        );
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

            <Tabs defaultValue="voice" className="w-full">
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

                {/* Voice Recognition */}
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
                                    onClick={
                                        isRecording
                                            ? () => setIsRecording(false)
                                            : handleStartRecording
                                    }
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
                                            Enregistrement actif
                                        </span>
                                    </div>
                                )}
                            </div>

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
                                    <div className="flex gap-2">
                                        <Button onClick={handleGenerateSummary} className="flex-1">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Générer un résumé
                                        </Button>
                                        <Button variant="outline" onClick={() => setTranscription('')}>
                                            Effacer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Automatic Summary */}
                <TabsContent value="summary" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Génération de résumé</CardTitle>
                            <CardDescription>
                                L'IA génère automatiquement un compte rendu structuré
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
                                    rows={6}
                                    placeholder="Saisissez ou dictez les notes de consultation..."
                                />
                            </div>

                            <Button
                                onClick={handleGenerateSummary}
                                disabled={!transcription}
                                className="w-full"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Générer le compte rendu
                            </Button>

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
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-900">
                                            {summary}
                                        </pre>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Sauvegarder dans le dossier
                                        </Button>
                                        <Button variant="outline" className="flex-1">
                                            Modifier
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Diagnosis Suggestions */}
                <TabsContent value="diagnosis" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Suggestions diagnostiques</CardTitle>
                            <CardDescription>
                                Basées sur les symptômes et l'historique du patient
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Symptom Input */}
                            <div>
                                <label className="text-sm font-medium text-gray-900 mb-2 block">
                                    Symptômes observés
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {aiSuggestions.symptoms.map((symptom) => (
                                        <Badge
                                            key={symptom}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-blue-100"
                                        >
                                            {symptom}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* AI Diagnosis Suggestions */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Diagnostics suggérés par l'IA
                                </h3>
                                <div className="space-y-3">
                                    {aiSuggestions.diagnoses.map((diagnosis, idx) => (
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

                            {/* Treatment Suggestions */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Traitements suggérés
                                </h3>
                                <div className="space-y-3">
                                    {aiSuggestions.treatments.map((treatment, idx) => (
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
                                                <Button size="sm" variant="outline">
                                                    Ajouter
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
