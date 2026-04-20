import { Response, Router } from 'express';
import { chatCompletion } from '../lib/llmClient';
import {
    formatRagContextForPrompt,
    retrieveRelevantChunks,
    type RagChunk
} from '../lib/ragRetrieval';
import { authenticateMedecin, AuthRequest } from '../middleware/auth';

const router = Router();

const SYSTEM_TUNISIA =
    "Tu es un assistant d'aide à la décision médicale pour des médecins en Tunisie. " +
    'Réponds en français clair. Tu ne remplaces pas le médecin : signale l’incertitude, ' +
    "cite les limites, et rappelle de vérifier les contre-indications et l'ordonnance locale. " +
    'Si des extraits de documents sont fournis, privilégie-les pour les faits factuels ; sinon reste prudent et général.';

function chunksToSources(chunks: RagChunk[]): { file: string; excerpt: string }[] {
    return chunks.map((c) => ({
        file: c.source,
        excerpt: c.text.length > 400 ? `${c.text.slice(0, 400)}…` : c.text
    }));
}

function extractJsonObject(text: string): string {
    let t = text.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
    if (fence) t = fence[1].trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return t.slice(start, end + 1);
    return t;
}

type DiagnosticPayload = {
    diagnoses: { nom: string; probabilite: number; criteres: string[] }[];
    treatments: {
        medicament: string;
        dosage: string;
        frequence: string;
        duree: string;
        indication: string;
    }[];
};

function parseDiagnosticPayload(raw: string): DiagnosticPayload {
    const jsonStr = extractJsonObject(raw);
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    const diagnosesRaw = Array.isArray(data.diagnoses) ? data.diagnoses : [];
    const treatmentsRaw = Array.isArray(data.treatments) ? data.treatments : [];

    const diagnoses = diagnosesRaw.map((d) => {
        const o = d as Record<string, unknown>;
        const nom = String(o.nom || o.name || 'Diagnostic').trim() || 'Diagnostic';
        const p = Number(o.probabilite ?? o.probability ?? 0);
        const probabilite = Math.max(0, Math.min(100, Number.isFinite(p) ? Math.round(p) : 0));
        const criteres = Array.isArray(o.criteres)
            ? (o.criteres as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];
        return { nom, probabilite, criteres };
    });

    const treatments = treatmentsRaw.map((t) => {
        const o = t as Record<string, unknown>;
        return {
            medicament: String(o.medicament || o.nom || '').trim() || '—',
            dosage: String(o.dosage || '').trim() || '—',
            frequence: String(o.frequence || o.frequence_administration || '').trim() || '—',
            duree: String(o.duree || '').trim() || '—',
            indication: String(o.indication || '').trim() || '—'
        };
    });

    return { diagnoses, treatments };
}

router.post('/summary', authenticateMedecin, async (req: AuthRequest, res: Response) => {
    try {
        const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
        if (!notes) {
            return res.status(400).json({ error: 'Le champ "notes" est requis (texte de consultation).' });
        }

        const chunks = retrieveRelevantChunks(notes, 5);
        const ragBlock = formatRagContextForPrompt(chunks);

        const userPrompt =
            'Voici des extraits de la base documentaire (contexte Tunisie / orientation clinique) :\n\n' +
            `${ragBlock}\n\n---\n\n` +
            'Notes brutes du médecin (à structurer) :\n\n' +
            `${notes}\n\n---\n\n` +
            'Produis un compte rendu structuré en markdown avec sections : Motif / Histoire / Examen / ' +
            'Hypothèses diagnostiques (à valider) / Proposition de suite (examens, orientation). ' +
            'Reste concis et professionnel.';

        const { content, model } = await chatCompletion(
            [
                { role: 'system', content: SYSTEM_TUNISIA },
                { role: 'user', content: userPrompt }
            ],
            { temperature: 0.3, maxTokens: 2500 }
        );

        return res.json({
            summary: content,
            model,
            ragSources: chunksToSources(chunks)
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur serveur';
        if (msg.includes('LLM_API_KEY')) {
            return res.status(503).json({
                error:
                    'Assistant IA non configuré : définissez LLM_API_KEY (et optionnellement LLM_BASE_URL, LLM_MODEL) sur le serveur.'
            });
        }
        console.error('[assistant/summary]', e);
        return res.status(502).json({ error: msg });
    }
});

router.post('/diagnostic', authenticateMedecin, async (req: AuthRequest, res: Response) => {
    try {
        const clinicalText =
            typeof req.body?.clinicalText === 'string'
                ? req.body.clinicalText.trim()
                : typeof req.body?.symptoms === 'string'
                  ? req.body.symptoms.trim()
                  : '';
        if (!clinicalText) {
            return res.status(400).json({
                error: 'Le champ "clinicalText" (ou "symptoms") est requis : symptômes ou notes cliniques.'
            });
        }

        const chunks = retrieveRelevantChunks(clinicalText, 5);
        const ragBlock = formatRagContextForPrompt(chunks);

        const userPrompt =
            'Extraits documentaires (contexte) :\n\n' +
            `${ragBlock}\n\n---\n\n` +
            'Description clinique :\n\n' +
            `${clinicalText}\n\n---\n\n` +
            'Réponds UNIQUEMENT avec un objet JSON valide (sans markdown autour), de la forme :\n' +
            '{"diagnoses":[{"nom":"string","probabilite":0-100,"criteres":["string"]}],"treatments":[' +
            '{"medicament":"string","dosage":"string","frequence":"string","duree":"string","indication":"string"}' +
            ']}\n' +
            'Propose 2 à 5 hypothèses diagnostiques ordonnées par probabilité (entier 0-100). ' +
            'Les traitements sont des pistes générales à valider (posologies indicatives), pas une prescription finale.';

        const { content, model } = await chatCompletion(
            [
                {
                    role: 'system',
                    content:
                        SYSTEM_TUNISIA +
                        ' Tu réponds uniquement avec le JSON demandé, sans texte avant ou après.'
                },
                { role: 'user', content: userPrompt }
            ],
            { temperature: 0.25, maxTokens: 2200 }
        );

        let payload: DiagnosticPayload;
        try {
            payload = parseDiagnosticPayload(content);
        } catch (parseErr) {
            console.error('[assistant/diagnostic] JSON parse', parseErr, content.slice(0, 800));
            return res.status(502).json({
                error: 'Le modèle n’a pas renvoyé un JSON exploitable. Réessayez ou raccourcissez le texte.',
                rawPreview: content.slice(0, 1200),
                model,
                ragSources: chunksToSources(chunks)
            });
        }

        return res.json({
            ...payload,
            model,
            ragSources: chunksToSources(chunks)
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur serveur';
        if (msg.includes('LLM_API_KEY')) {
            return res.status(503).json({
                error:
                    'Assistant IA non configuré : définissez LLM_API_KEY (et optionnellement LLM_BASE_URL, LLM_MODEL) sur le serveur.'
            });
        }
        console.error('[assistant/diagnostic]', e);
        return res.status(502).json({ error: msg });
    }
});

export default router;
