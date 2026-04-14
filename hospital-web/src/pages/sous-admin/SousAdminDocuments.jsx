import { FileText, Search, Send, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import api from '../../lib/api';

export default function SousAdminDocuments() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [titre, setTitre] = useState('');
    const [urlFichier, setUrlFichier] = useState('');
    const [type, setType] = useState('');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    const fetchPatients = async (searchValue = '') => {
        try {
            const res = await api.get('/sous-admin/documents/patients', {
                params: searchValue ? { search: searchValue } : {}
            });
            setPatients(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Patients fetch error:', err);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const filteredPatients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter((p) =>
            `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q)
        );
    }, [patients, search]);

    const selectedPatient = patients.find((p) => p.id === selectedPatientId);

    const handleSend = async () => {
        if (!selectedPatientId || !titre.trim() || !urlFichier.trim()) {
            setError('Patient, titre et URL du document sont requis.');
            setFeedback('');
            return;
        }
        try {
            setSending(true);
            setError('');
            setFeedback('');
            await api.post('/sous-admin/documents/send', {
                patientId: selectedPatientId,
                titre: titre.trim(),
                urlFichier: urlFichier.trim(),
                type: type.trim() || null
            });
            setFeedback('Document envoyé avec succès. Le patient reçoit une notification.');
            setTitre('');
            setUrlFichier('');
            setType('');
        } catch (err) {
            console.error('Send document error:', err);
            setError(err?.response?.data?.error || "Erreur lors de l'envoi du document.");
            setFeedback('');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Documents Patients</h1>
                <p className="text-sm text-gray-500 mt-2">Recevez un document prêt et envoyez-le au bon patient.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-1 p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Choisir le patient</h2>
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Nom, prénom, email..."
                            className="w-full h-11 rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="max-h-[450px] overflow-y-auto space-y-2">
                        {loading ? (
                            <p className="text-sm text-gray-400">Chargement...</p>
                        ) : filteredPatients.length === 0 ? (
                            <p className="text-sm text-gray-400">Aucun patient trouvé.</p>
                        ) : filteredPatients.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPatientId(p.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedPatientId === p.id
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{p.fullName}</p>
                                        <p className="text-xs text-gray-500">{p.email}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card className="xl:col-span-2 p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 className="font-bold text-gray-900 text-lg mb-1">Envoyer un document</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Patient sélectionné: <span className="font-semibold text-gray-700">{selectedPatient ? selectedPatient.fullName : 'Aucun'}</span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du document</label>
                            <input
                                value={titre}
                                onChange={(e) => setTitre(e.target.value)}
                                placeholder="Ex: Résultat analyse sanguine"
                                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL du fichier</label>
                            <input
                                value={urlFichier}
                                onChange={(e) => setUrlFichier(e.target.value)}
                                placeholder="https://..."
                                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type (optionnel)</label>
                            <input
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                placeholder="Ex: Analyse, Ordonnance, Imagerie..."
                                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {error && <p className="mt-4 text-sm text-rose-600 font-medium">{error}</p>}
                    {feedback && <p className="mt-4 text-sm text-emerald-600 font-medium">{feedback}</p>}

                    <div className="mt-6">
                        <Button
                            onClick={handleSend}
                            disabled={sending}
                            className="h-11 px-6 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {sending ? 'Envoi...' : 'Envoyer au patient'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Le document apparaîtra dans la page Documents du patient et une notification sera envoyée.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
