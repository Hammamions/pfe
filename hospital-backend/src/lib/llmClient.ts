/**
 * Client HTTP pour une API de chat compatible OpenAI (DeepSeek, OpenAI, Mistral, etc.).
 * La clé ne doit jamais être exposée au navigateur : appels uniquement côté serveur.
 */
import dotenv from 'dotenv';
dotenv.config();

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatCompletionResult = {
    content: string;
    model: string;
};

function normalizeBaseUrl(raw: string): string {
    return raw.replace(/\/+$/, '');
}

function pickErrorMessage(data: unknown): string {
    if (typeof data !== 'object' || data === null) return '';
    const o = data as Record<string, unknown>;
    const err = o.error;
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && err !== null && 'message' in err) {
        return String((err as { message?: unknown }).message || '');
    }
    if (typeof o.message === 'string') return o.message;
    return '';
}

/** Message utilisateur (français) pour les erreurs API courantes. */
export function formatLlmHttpError(status: number, data: unknown, rawText: string): string {
    const apiMsg = pickErrorMessage(data).trim();
    const lower = apiMsg.toLowerCase();

    if (status === 402 || lower.includes('insufficient balance')) {
        return (
            'Crédits API épuisés ou solde insuffisant (HTTP 402). Rechargez votre compte sur le tableau de bord ' +
            'du fournisseur (ex. DeepSeek : facturation / recharge), ou utilisez une autre clé API.'
        );
    }
    if (status === 401) {
        return 'Clé API refusée (HTTP 401). Vérifiez LLM_API_KEY et que la clé n’a pas été révoquée.';
    }
    if (status === 429) {
        return 'Limite de débit atteinte (HTTP 429). Réessayez plus tard ou changez de modèle / de forfait.';
    }

    const detail = apiMsg || (typeof data === 'object' && data !== null && 'error' in data
        ? JSON.stringify((data as { error?: unknown }).error)
        : rawText.slice(0, 400));
    return `Erreur du service LLM (HTTP ${status}) : ${detail}`;
}

export function getLlmConfig(): { apiKey: string; baseUrl: string; model: string } | null {
    // On récupère les valeurs avec des replis (fallbacks) vers le gratuit
    const apiKey = (process.env.LLM_API_KEY || 'no-key-required').trim();

    // Par défaut, on peut viser Groq ou Ollama si rien n'est fourni
    const baseUrl = normalizeBaseUrl(
        process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
    );

    const model = (process.env.LLM_MODEL || 'llama-3.1-8b-instant').trim();

    return { apiKey, baseUrl, model };
}

export async function chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<ChatCompletionResult> {
    const cfg = getLlmConfig();
    if (!cfg) {
        throw new Error('LLM_API_KEY manquant dans la configuration serveur.');
    }
    const url = `${cfg.baseUrl}/chat/completions`;
    const temperature = options?.temperature ?? 0.35;
    const max_tokens = options?.maxTokens ?? 2048;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`
        },
        body: JSON.stringify({
            model: cfg.model,
            messages,
            temperature,
            max_tokens
        })
    });

    const rawText = await res.text();
    let data: unknown;
    try {
        data = JSON.parse(rawText) as unknown;
    } catch {
        throw new Error(`Réponse LLM non JSON (HTTP ${res.status})`);
    }

    if (!res.ok) {
        throw new Error(formatLlmHttpError(res.status, data, rawText));
    }

    const choices = (data as { choices?: { message?: { content?: string } }[] }).choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Réponse LLM vide ou invalide.');
    }
    const model = (data as { model?: string }).model || cfg.model;
    return { content: content.trim(), model };
}

export async function transcribeAudio(
    fileBuffer: Buffer,
    fileName: string
): Promise<string> {
    const cfg = getLlmConfig();
    if (!cfg) {
        throw new Error('LLM_API_KEY manquant dans la configuration serveur.');
    }

    const apiKey = cfg.apiKey;
    console.log('Transcription Debug:', {
        url: `https://api.groq.com/openai/v1/audio/transcriptions`,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 7)
    });

    // L'API Groq Transcription utilise du multipart/form-data
    const formData = new FormData();
    // Correction pour Node.js : Buffer vers Uint8Array vers Blob
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'audio/webm' });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    const url = `https://api.groq.com/openai/v1/audio/transcriptions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`
        },
        body: formData
    });

    const rawText = await res.text();
    console.log('Groq Response Status:', res.status);
    console.log('Groq Response Body:', rawText);

    let data: unknown;
    try {
        data = JSON.parse(rawText) as unknown;
    } catch {
        throw new Error(`Réponse Transcription non JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
    }

    if (!res.ok) {
        throw new Error(formatLlmHttpError(res.status, data, rawText));
    }

    const text = (data as { text?: string }).text;
    if (typeof text !== 'string') {
        throw new Error('Réponse Transcription vide ou invalide.');
    }

    return text.trim();
}
