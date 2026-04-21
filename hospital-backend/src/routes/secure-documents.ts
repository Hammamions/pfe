import { randomUUID } from 'crypto';
import { Response, Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { anchorHashOnChain } from '../chain/anchor';
import {
    decryptPdfFromStorage,
    encryptPdfForStorage,
    normalizeSha256Hex,
    sha256Hex,
    verifyP256Sha256Signature
} from '../crypto/secureDocCrypto';
import { prisma } from '../lib/prisma';
import { authenticateMedecin, authenticatePatient, AuthRequest } from '../middleware/auth';
import { mintDocumentVerifyJwt } from '../utils/documentVerifyJwt';

const router = Router();

const secureDir = path.join(process.cwd(), 'uploads', 'secure-documents');
fs.mkdirSync(secureDir, { recursive: true });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

router.post('/signing-key', authenticateMedecin, async (req: AuthRequest, res: Response) => {
    const { spkiBase64 } = (req.body ?? {}) as { spkiBase64?: string };
    if (!spkiBase64 || typeof spkiBase64 !== 'string' || spkiBase64.length < 32) {
        return res.status(400).json({ error: 'spkiBase64 requis (clé publique P-256 SPKI DER en base64)' });
    }
    try {
        const med = await prisma.medecin.update({
            where: { utilisateurId: req.userId! },
            data: { signingPublicKeySpkiBase64: spkiBase64.trim() }
        });
        return res.json({ message: 'Clé publique enregistrée', medecinId: med.id });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post(
    '/seal',
    authenticateMedecin,
    upload.single('file'),
    async (req: AuthRequest, res: Response) => {
        const file = req.file;
        const patientIdRaw = req.body?.patientId;
        const titre = (req.body?.titre as string)?.trim();
        const contentHashHex = normalizeSha256Hex(String(req.body?.sha256Hex || ''));
        const signatureBase64 = (req.body?.signatureBase64 as string)?.trim();

        if (!file?.buffer?.length) {
            return res.status(400).json({ error: 'Fichier PDF manquant (champ multipart file)' });
        }
        if (!titre) return res.status(400).json({ error: 'titre requis' });
        if (!contentHashHex) return res.status(400).json({ error: 'sha256Hex invalide (64 car. hex)' });
        if (!signatureBase64) return res.status(400).json({ error: 'signatureBase64 requis' });

        const patientId = parseInt(String(patientIdRaw), 10);
        if (Number.isNaN(patientId)) {
            return res.status(400).json({ error: 'patientId invalide (id Patient en base)' });
        }

        try {
            const medecin = await prisma.medecin.findUnique({
                where: { utilisateurId: req.userId! },
                include: { utilisateur: true }
            });
            if (!medecin?.signingPublicKeySpkiBase64) {
                return res.status(400).json({
                    error: 'Enregistrez d’abord votre clé publique (POST /api/secure-documents/signing-key)'
                });
            }

            const computed = sha256Hex(file.buffer);
            if (computed !== contentHashHex) {
                return res.status(400).json({ error: 'sha256Hex ne correspond pas au fichier uploadé' });
            }

            const sigOk = verifyP256Sha256Signature({
                sha256Hex: contentHashHex,
                signatureDerBase64: signatureBase64,
                spkiBase64: medecin.signingPublicKeySpkiBase64
            });
            if (!sigOk) {
                return res.status(400).json({ error: 'Signature médecin invalide' });
            }

            const patient = await prisma.patient.findUnique({
                where: { id: patientId },
                include: { utilisateur: true }
            });
            if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

            const dossier = await prisma.dossierMedical.upsert({
                where: { patientId: patient.id },
                create: { patientId: patient.id },
                update: {}
            });

            const publicId = randomUUID();

            const { cipher, iv, authTag } = encryptPdfForStorage(file.buffer);
            const relPath = path.join('uploads', 'secure-documents', `${publicId}.bin`);
            const absPath = path.join(process.cwd(), relPath);
            fs.writeFileSync(absPath, cipher);

            let anchorTxHash: string | null = null;
            let anchorChainId: number | null = null;
            let anchorContractAddress: string | null = null;
            let anchorBlockNumber: bigint | null = null;
            let anchoredAt: Date | null = null;

            const anchorResult = await anchorHashOnChain(contentHashHex);
            if (anchorResult) {
                anchorTxHash = anchorResult.txHash;
                anchorChainId = anchorResult.chainId;
                anchorContractAddress = anchorResult.contractAddress;
                anchorBlockNumber = anchorResult.blockNumber;
                anchoredAt = new Date();
            }

            const praticien = `Dr. ${medecin.utilisateur.prenom} ${medecin.utilisateur.nom}`;
            const urlFichier = `/api/secure-documents/download/${publicId}`;

            const doc = await prisma.document.create({
                data: {
                    titre,
                    urlFichier,
                    type: 'secure_medical',
                    praticien,
                    dossierMedicalId: dossier.id,
                    medecinId: medecin.id,
                    publicId,
                    contentSha256: contentHashHex,
                    signatureBase64,
                    signingKeySpkiSnapshot: medecin.signingPublicKeySpkiBase64,
                    cipherStoragePath: relPath,
                    aesIvBase64: iv.toString('base64'),
                    aesAuthTagBase64: authTag.toString('base64'),
                    anchorTxHash,
                    anchorChainId: anchorChainId ?? undefined,
                    anchorContractAddress: anchorContractAddress ?? undefined,
                    anchorBlockNumber: anchorBlockNumber ?? undefined,
                    anchoredAt
                }
            });

            const verifyToken = mintDocumentVerifyJwt(publicId);

            await prisma.notification.create({
                data: {
                    utilisateurId: patient.utilisateurId,
                    titre: 'Document sécurisé',
                    message: `Un document sécurisé (« ${titre} ») a été ajouté à votre dossier.`
                }
            });

            return res.status(201).json({
                id: doc.id,
                publicId,
                titre: doc.titre,
                urlFichier: doc.urlFichier,
                contentSha256: doc.contentSha256,
                anchorTxHash: doc.anchorTxHash,
                anchorChainId: doc.anchorChainId,
                anchoredAt: doc.anchoredAt,
                verifyToken,
                verifyPath: `/api/verify/document?t=${encodeURIComponent(verifyToken)}`
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('SECURE_DOCS_STORAGE_KEY')) {
                return res.status(500).json({ error: msg });
            }
            console.error(e);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

router.get('/download/:publicId', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const publicId = String(req.params.publicId || '').trim();
    try {
        const doc = await prisma.document.findFirst({
            where: {
                publicId,
                dossierMedical: { patient: { utilisateurId: req.userId! } }
            }
        });
        if (!doc?.cipherStoragePath || !doc.aesIvBase64 || !doc.aesAuthTagBase64) {
            return res.status(404).json({ error: 'Document introuvable' });
        }

        const abs = path.join(process.cwd(), doc.cipherStoragePath);
        if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Fichier absent' });

        const cipher = fs.readFileSync(abs);
        const iv = Buffer.from(doc.aesIvBase64, 'base64');
        const authTag = Buffer.from(doc.aesAuthTagBase64, 'base64');
        const plain = decryptPdfFromStorage(cipher, iv, authTag);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.titre || 'document')}.pdf"`);
        return res.send(plain);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/verify-token/:publicId', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const publicId = String(req.params.publicId || '').trim();
    try {
        const doc = await prisma.document.findFirst({
            where: {
                publicId,
                dossierMedical: { patient: { utilisateurId: req.userId! } } }
        });
        if (!doc?.publicId) return res.status(404).json({ error: 'Document introuvable' });
        const verifyToken = mintDocumentVerifyJwt(publicId);
        return res.json({
            verifyToken,
            verifyPath: `/api/verify/document?t=${encodeURIComponent(verifyToken)}`
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
