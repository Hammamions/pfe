import { createCipheriv, createDecipheriv, createHash, createPublicKey, createVerify, randomBytes } from 'crypto';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

export function sha256Hex(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
}

export function normalizeSha256Hex(input: string): string | null {
    const s = String(input || '')
        .trim()
        .replace(/^0x/i, '')
        .toLowerCase();
    if (!SHA256_HEX.test(s)) return null;
    return s;
}

/** Message = UTF-8 bytes of the 64-char lowercase hex (no 0x), same as WebCrypto sign over encoded string. */
export function verifyP256Sha256Signature(params: {
    sha256Hex: string;
    signatureDerBase64: string;
    spkiBase64: string;
}): boolean {
    try {
        const pub = Buffer.from(params.spkiBase64, 'base64');
        const key = createPublicKey({ key: pub, format: 'der', type: 'spki' });
        const verify = createVerify('SHA256');
        verify.update(Buffer.from(params.sha256Hex, 'utf8'));
        verify.end();
        return verify.verify(key, Buffer.from(params.signatureDerBase64, 'base64'));
    } catch {
        return false;
    }
}

function getStorageKey(): Buffer {
    const raw = process.env.SECURE_DOCS_STORAGE_KEY || '';
    const trimmed = raw.trim();
    if (trimmed.length === 64 && /^[a-f0-9]+$/i.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }
    if (trimmed.length >= 8) {
        return createHash('sha256').update(trimmed, 'utf8').digest();
    }
    throw new Error('SECURE_DOCS_STORAGE_KEY manquant ou trop court (min 8 car. ou 64 hex)');
}

export function encryptPdfForStorage(plain: Buffer): { cipher: Buffer; iv: Buffer; authTag: Buffer } {
    const key = getStorageKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { cipher: encrypted, iv, authTag };
}

export function decryptPdfFromStorage(cipher: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const key = getStorageKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(cipher), decipher.final()]);
}
