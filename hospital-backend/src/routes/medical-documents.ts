import { Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Texte des comptes rendus envoyés en sécurisé, pour rétrocompatibilité (avant `Document.securePreviewSummary`). */
function listSecureConsultationSummariesFromHistorique(historiqueMedical: string[] | null | undefined) {
    const out: { at: number; summary: string }[] = [];
    for (const entry of Array.isArray(historiqueMedical) ? historiqueMedical : []) {
        if (typeof entry !== 'string') continue;
        const raw = entry.trim();
        if (!raw.startsWith('{')) continue;
        try {
            const p = JSON.parse(raw) as {
                kind?: string;
                sentSecure?: boolean;
                summary?: string;
                createdAt?: string;
            };
            if (p?.kind !== 'consultation_report' || !p?.sentSecure) continue;
            const summary = String(p.summary || '').trim();
            if (!summary) continue;
            const d = p.createdAt ? new Date(p.createdAt) : null;
            const at = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
            out.push({ at, summary });
        } catch {
            /* ignore */
        }
    }
    out.sort((a, b) => a.at - b.at);
    return out;
}

/**
 * Renseigne `securePreviewSummary` quand la colonne est vide, en rapprochant la date du document
 * de l’horodatage JSON poussé dans l’historique (même transaction ou quasi simultané).
 */
function backfillSecurePreviewFromHistorique<
    T extends {
        securePreviewSummary: string | null;
        publicId?: string | null;
        type?: string | null;
        category?: string | null;
        createdAt: Date | string;
    }
>(docs: T[], historiqueMedical: string[] | null | undefined) {
    const candidates = listSecureConsultationSummariesFromHistorique(historiqueMedical);
    if (!candidates.length) return;

    const WINDOW_MS = 25 * 60 * 1000;
    const needs = docs.filter(
        (r) =>
            !(r.securePreviewSummary && String(r.securePreviewSummary).trim()) &&
            r.publicId &&
            String(r.type || r.category || '').toLowerCase() === 'secure_medical'
    );
    const used = new Set<number>();
    for (const r of needs) {
        const docT = new Date(r.createdAt).getTime();
        let bestJ = -1;
        let bestDiff = Infinity;
        for (let j = 0; j < candidates.length; j++) {
            if (used.has(j)) continue;
            const diff = Math.abs(docT - candidates[j].at);
            if (diff <= WINDOW_MS && diff < bestDiff) {
                bestDiff = diff;
                bestJ = j;
            }
        }
        if (bestJ >= 0) {
            used.add(bestJ);
            r.securePreviewSummary = candidates[bestJ].summary;
        }
    }
}

const getRemoteFileSize = async (url: string) => {
    const u = String(url || '').trim();
    // Pas d’URL absolue : fetch côté serveur échoue ou bloque longtemps (ex. `/api/secure-documents/...`).
    if (!u || u.startsWith('/') || !/^https?:\/\//i.test(u)) return null;
    try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 4000);
        const headResponse = await fetch(u, { method: 'HEAD', signal: ac.signal });
        clearTimeout(t);
        const length = headResponse.headers.get('content-length');
        if (!length) return null;
        return formatBytes(parseInt(length, 10));
    } catch {
        return null;
    }
};

router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { dossierMedical: { include: { documents: true } } }
        });

        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const documentsWithMeta = patient.dossierMedical
            ? await Promise.all(
                patient.dossierMedical.documents
                    .filter((d) => (d.type || '').toLowerCase() !== 'ordonnance')
                    .map(async (doc) => {
                    const remoteSize = await getRemoteFileSize(doc.urlFichier);
                    const praticien = doc.praticien?.trim() || 'Service hospitalier';
                    return {
                        id: doc.id,
                        titre: doc.titre,
                        urlFichier: doc.urlFichier,
                        type: doc.type,
                        createdAt: doc.createdAt,
                        dossierMedicalId: doc.dossierMedicalId,
                        publicId: doc.publicId,
                        contentSha256: doc.contentSha256 || null,
                        anchorTxHash: doc.anchorTxHash,
                        anchorChainId: doc.anchorChainId,
                        anchoredAt: doc.anchoredAt,
                        anchorBlockNumber:
                            doc.anchorBlockNumber != null ? doc.anchorBlockNumber.toString() : null,
                        praticien,
                        emittedBy: praticien,
                        size: remoteSize || 'Inconnue',
                        category: doc.type || 'autre',
                        isOrdonnance: false,
                        isSecureDocument: Boolean(doc.publicId),
                        securePreviewSummary: doc.securePreviewSummary ?? null
                    };
                })
            )
            : [];

        backfillSecurePreviewFromHistorique(
            documentsWithMeta,
            patient.dossierMedical?.historiqueMedical ?? []
        );

        const ordonnances = await prisma.ordonnance.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            include: { medecin: { include: { utilisateur: true } } }
        });

        const ordonnanceRows = ordonnances.map((o) => {
            const pr = `Dr. ${o.medecin.utilisateur.prenom} ${o.medecin.utilisateur.nom}`;
            const practitionerParam = encodeURIComponent(pr);
            return {
                id: `ord_${o.id}`,
                titre: 'Ordonnance médicale',
                urlFichier: o.urlPdf || `?source=ordonnance&practitioner=${practitionerParam}`,
                type: 'ordonnance',
                praticien: pr,
                emittedBy: pr,
                createdAt: o.createdAt,
                size: o.urlPdf ? 'PDF' : '—',
                category: 'ordonnance',
                ordonnanceContenu: o.contenu,
                isOrdonnance: true,
                medecinSpecialite: o.medecin.specialite?.trim() || null,
                medecinNumeroOrdre: o.medecin.licenseNumber?.trim() || null
            };
        });

        const merged = [...ordonnanceRows, ...documentsWithMeta].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return res.json(merged);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { titre, urlFichier, type } = req.body;
    if (!titre || !urlFichier) {
        return res.status(400).json({ error: 'Titre et URL du fichier requis' });
    }

    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });


        const dossier = await prisma.dossierMedical.upsert({
            where: { patientId: patient.id },
            create: { patientId: patient.id },
            update: {}
        });

        const doc = await prisma.document.create({
            data: {
                titre,
                urlFichier,
                type: type || null,
                praticien: `Patient ${patient.utilisateur.prenom} ${patient.utilisateur.nom}`,
                dossierMedicalId: dossier.id
            }
        });


        await prisma.notification.create({
            data: {
                utilisateurId: req.userId!,
                titre: 'Document ajouté',
                message: `Le document "${titre}" a été ajouté à votre dossier médical.`
            }
        });

        return res.status(201).json(doc);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


const parseClientIdForDelete = (raw: unknown): string => decodeURIComponent(String(raw ?? '').trim());

const deletePatientDocumentOrOrdonnance = async (req: AuthRequest, rawInput: unknown) => {
    const patient = await prisma.patient.findUnique({
        where: { utilisateurId: req.userId },
        include: { dossierMedical: true }
    });
    if (!patient) return { status: 404 as const, body: { error: 'Patient non trouvé' } };

    const raw = parseClientIdForDelete(rawInput);
    if (!raw) return { status: 400 as const, body: { error: 'ID requis' } };

    const ordMatch = /^ord_(\d+)$/i.exec(raw);
    if (ordMatch) {
        const ordonnanceId = parseInt(ordMatch[1], 10);
        const mine = await prisma.ordonnance.findFirst({
            where: { id: ordonnanceId, patientId: patient.id }
        });
        if (mine) {
            await prisma.ordonnance.delete({ where: { id: ordonnanceId } });
            return { status: 200 as const, body: { message: 'Ordonnance supprimée' } };
        }
        const existsOther = await prisma.ordonnance.findFirst({ where: { id: ordonnanceId } });
        if (existsOther) {
            return { status: 403 as const, body: { error: 'Accès refusé pour cette ordonnance' } };
        }
        return {
            status: 200 as const,
            body: { message: 'Ordonnance déjà absente', alreadyGone: true }
        };
    }

    const documentId = parseInt(raw, 10);
    if (Number.isNaN(documentId)) {
        return { status: 400 as const, body: { error: 'ID document invalide' } };
    }
    if (!patient.dossierMedical) {
        return { status: 404 as const, body: { error: 'Dossier non trouvé' } };
    }

    const mineDoc = await prisma.document.findFirst({
        where: { id: documentId, dossierMedicalId: patient.dossierMedical.id }
    });
    if (mineDoc) {
        await prisma.document.delete({ where: { id: documentId } });
        return { status: 200 as const, body: { message: 'Document supprimé' } };
    }
    const mineOrdNumeric = await prisma.ordonnance.findFirst({
        where: { id: documentId, patientId: patient.id }
    });
    if (mineOrdNumeric) {
        await prisma.ordonnance.delete({ where: { id: documentId } });
        return { status: 200 as const, body: { message: 'Ordonnance supprimée' } };
    }
    const docElsewhere = await prisma.document.findFirst({ where: { id: documentId } });
    if (docElsewhere) {
        return { status: 403 as const, body: { error: 'Accès refusé pour ce document' } };
    }
    return {
        status: 200 as const,
        body: { message: 'Document déjà absent', alreadyGone: true }
    };
};

router.post('/remove', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const result = await deletePatientDocumentOrOrdonnance(req, req.body?.id);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const result = await deletePatientDocumentOrOrdonnance(req, req.params.id);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;