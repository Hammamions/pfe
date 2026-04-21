import { Response, Router } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { prisma } from '../lib/prisma';
import { verifyAnchorInReceipt } from '../chain/anchor';
import { decryptPdfFromStorage, sha256Hex, verifyP256Sha256Signature } from '../crypto/secureDocCrypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tunisante_secret_key_2026';

router.get('/document', async (req, res: Response) => {
    const raw = req.query.t;
    const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Paramètre t (token) manquant' });
    }

    let publicId: string;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { typ?: string; publicId?: string };
        if (decoded.typ !== 'doc_verify' || !decoded.publicId) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        publicId = decoded.publicId;
    } catch {
        return res.status(403).json({ error: 'Token expiré ou invalide' });
    }

    try {
        const doc = await prisma.document.findUnique({
            where: { publicId }
        });
        if (!doc || !doc.contentSha256 || !doc.cipherStoragePath || !doc.aesIvBase64 || !doc.aesAuthTagBase64) {
            return res.status(404).json({ error: 'Document introuvable' });
        }

        const abs = path.join(process.cwd(), doc.cipherStoragePath);
        if (!fs.existsSync(abs)) {
            return res.status(500).json({ error: 'Fichier chiffré absent' });
        }

        const cipher = fs.readFileSync(abs);
        const iv = Buffer.from(doc.aesIvBase64, 'base64');
        const authTag = Buffer.from(doc.aesAuthTagBase64, 'base64');
        let plain: Buffer;
        try {
            plain = decryptPdfFromStorage(cipher, iv, authTag);
        } catch {
            return res.status(500).json({ error: 'Échec du déchiffrement' });
        }

        const recomputed = sha256Hex(plain);
        const hashOk = recomputed === doc.contentSha256;
        const hasDigitalSeal = !!(doc.signatureBase64 && doc.signingKeySpkiSnapshot);
        const sigOk = hasDigitalSeal
            ? verifyP256Sha256Signature({
                  sha256Hex: doc.contentSha256,
                  signatureDerBase64: doc.signatureBase64 as string,
                  spkiBase64: doc.signingKeySpkiSnapshot as string
              })
            : false;

        let chainOk: boolean | null = null;
        if (doc.anchorTxHash && doc.anchorContractAddress && doc.anchorChainId != null && doc.contentSha256) {
            const rpc = (process.env.ANCHOR_RPC_URL || '').trim();
            if (!rpc) {
                chainOk = false;
            } else {
                chainOk = await verifyAnchorInReceipt({
                    txHash: doc.anchorTxHash as `0x${string}`,
                    expectedSha256Hex: doc.contentSha256,
                    contractAddress: doc.anchorContractAddress as `0x${string}`,
                    rpcUrl: rpc,
                    chainId: doc.anchorChainId
                });
            }
        }

        const sealedAuthentic =
            hasDigitalSeal && hashOk && sigOk && (!doc.anchorTxHash || chainOk === true);

        let status: string;
        let documentKind: 'sealed_medical' | 'encrypted_consultation';
        let summaryFr: string;

        if (!hashOk) {
            status = 'NON_CONFORME';
            documentKind = hasDigitalSeal ? 'sealed_medical' : 'encrypted_consultation';
            summaryFr =
                'Le contenu déchiffré ne correspond pas à l’empreinte enregistrée (intégrité non vérifiée).';
        } else if (hasDigitalSeal) {
            documentKind = 'sealed_medical';
            if (sealedAuthentic) {
                status = 'AUTHENTIQUE';
                summaryFr =
                    'Document scellé : intégrité OK, signature médecin valide' +
                    (doc.anchorTxHash ? ', ancrage blockchain vérifié ou non requis.' : '.');
            } else {
                status = 'NON_CONFORME';
                summaryFr =
                    !sigOk
                        ? 'Intégrité du fichier OK, mais signature numérique invalide ou absente.'
                        : doc.anchorTxHash && chainOk !== true
                          ? 'Signature OK ; ancrage blockchain absent ou non vérifiable (RPC / reçu).'
                          : 'Document non conforme aux critères de scellement.';
            }
        } else {
            documentKind = 'encrypted_consultation';
            const rpcConfigured = !!(process.env.ANCHOR_RPC_URL || '').trim();
            if (doc.anchorTxHash && chainOk === true) {
                status = 'CHIFFRE_INTEGRITE_ANCRE';
                summaryFr =
                    'Stockage chiffré + intégrité du PDF vérifiée ; empreinte confirmée sur la blockchain (compte rendu ou document sans signature médecin).';
            } else if (doc.anchorTxHash && !rpcConfigured) {
                status = 'CHIFFRE_INTEGRITE';
                summaryFr =
                    'Stockage chiffré + intégrité OK ; ancrage enregistré en base mais ANCHOR_RPC_URL n’est pas configuré sur ce serveur pour revérifier la chaîne.';
            } else if (doc.anchorTxHash && rpcConfigured && chainOk === false) {
                status = 'NON_CONFORME';
                summaryFr =
                    'Intégrité du fichier OK, mais l’ancrage blockchain enregistré ne correspond pas au reçu (empreinte ou contrat).';
            } else {
                status = 'CHIFFRE_INTEGRITE';
                summaryFr =
                    'Stockage chiffré + intégrité du PDF vérifiée. Pas d’ancrage blockchain sur cet enregistrement (variables ANCHOR_* non définies ou ancrage ignoré à l’envoi).';
            }
        }

        return res.json({
            status,
            documentKind,
            summaryFr,
            publicId: doc.publicId,
            hashMatch: hashOk,
            hasDigitalSeal,
            signatureValid: hasDigitalSeal ? sigOk : null,
            chainAnchored: doc.anchorTxHash != null,
            chainEventMatch: chainOk,
            anchoredAt: doc.anchoredAt,
            anchorTxHash: doc.anchorTxHash,
            /** @deprecated Utiliser `status` + `documentKind`. */
            legacyAuthentic: sealedAuthentic
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
