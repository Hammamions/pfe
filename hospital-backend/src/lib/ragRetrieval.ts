import fs from 'fs';
import path from 'path';

export type RagChunk = {
    /** Nom du fichier source (sans chemin) */
    source: string;
    text: string;
};

const STOP_FR = new Set([
    'les',
    'des',
    'une',
    'pour',
    'avec',
    'sans',
    'dans',
    'sur',
    'sous',
    'entre',
    'vers',
    'chez',
    'et',
    'ou',
    'mais',
    'donc',
    'car',
    'est',
    'sont',
    'été',
    'être',
    'avoir',
    'fait',
    'faire',
    'qui',
    'que',
    'quoi',
    'dont',
    'ce',
    'ces',
    'cet',
    'cette',
    'il',
    'elle',
    'ils',
    'elles',
    'nous',
    'vous',
    'leur',
    'leurs',
    'de',
    'du',
    'des',
    'la',
    'le',
    'au',
    'aux',
    'un',
    'par',
    'plus',
    'pas',
    'tout',
    'toute',
    'toutes',
    'très',
    'comme',
    'aussi',
    'son',
    'sa',
    'ses',
    'mon',
    'ma',
    'mes',
    'ton',
    'ta',
    'tes',
    'notre',
    'votre',
    'aux',
    'the'
]);

function stripDiacritics(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function tokenizeForRag(text: string): string[] {
    const lower = stripDiacritics(text.toLowerCase());
    return lower
        .split(/[^a-z0-9àâäéèêëïîôùûçœæ]+/i)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !STOP_FR.has(w));
}

function scoreChunk(queryTokens: Set<string>, chunkText: string): number {
    const chunkTokens = tokenizeForRag(chunkText);
    if (!chunkTokens.length) return 0;
    let hit = 0;
    for (const t of chunkTokens) {
        if (queryTokens.has(t)) hit += 1;
    }
    return hit / Math.sqrt(chunkTokens.length);
}

function splitIntoParagraphChunks(body: string, maxChars = 900): string[] {
    const parts = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let buf = '';
    for (const p of parts) {
        if ((buf + '\n\n' + p).length > maxChars && buf) {
            chunks.push(buf.trim());
            buf = p;
        } else {
            buf = buf ? `${buf}\n\n${p}` : p;
        }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.length ? chunks : [body.trim()].filter(Boolean);
}

let corpusCache: RagChunk[] | null = null;

/**
 * Charge les fichiers .txt du dossier rag-corpus/ à la racine du backend.
 */
export function loadRagCorpus(corpusDir?: string): RagChunk[] {
    if (corpusCache) return corpusCache;
    const dir = corpusDir || path.join(process.cwd(), 'rag-corpus');
    if (!fs.existsSync(dir)) {
        corpusCache = [];
        return corpusCache;
    }
    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.txt'));
    const out: RagChunk[] = [];
    for (const file of files) {
        const full = path.join(dir, file);
        try {
            const body = fs.readFileSync(full, 'utf8');
            for (const c of splitIntoParagraphChunks(body)) {
                out.push({ source: file, text: c });
            }
        } catch {
            /* ignore unreadable */
        }
    }
    corpusCache = out;
    return out;
}

export function invalidateRagCorpusCache(): void {
    corpusCache = null;
}

export function retrieveRelevantChunks(query: string, topK = 5): RagChunk[] {
    const qTokens = tokenizeForRag(query);
    if (!qTokens.length) return [];
    const qSet = new Set(qTokens);
    const corpus = loadRagCorpus();
    const scored = corpus
        .map((chunk) => ({ chunk, score: scoreChunk(qSet, chunk.text) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((x) => x.chunk);
    return scored;
}

export function formatRagContextForPrompt(chunks: RagChunk[]): string {
    if (!chunks.length) {
        return '(Aucun extrait pertinent trouvé dans la base documentaire locale. Répondez à partir des notes cliniques et des connaissances générales, en restant prudent.)';
    }
    return chunks
        .map((c, i) => `--- Document ${i + 1} [${c.source}] ---\n${c.text}`)
        .join('\n\n');
}
