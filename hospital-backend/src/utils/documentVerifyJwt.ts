import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tunisante_secret_key_2026';

/** JWT court pour la page publique `/api/verify/document?t=…`. */
export function mintDocumentVerifyJwt(publicId: string): string {
    const expiresIn = String(process.env.DOC_VERIFY_JWT_EXPIRES || '7d');
    return jwt.sign({ typ: 'doc_verify', publicId }, JWT_SECRET as Secret, { expiresIn } as SignOptions);
}
