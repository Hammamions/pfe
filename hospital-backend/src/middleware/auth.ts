import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tunisante_secret_key_2026';

export interface AuthRequest extends Request {
    userId?: number;
    userEmail?: string;
    role?: string;
    patientId?: number;
    sousAdminId?: number;
}


export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.role = decoded.role;
        next();
    } catch {
        return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
};


export const authenticatePatient = (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
        if (req.role !== 'PATIENT') return res.status(403).json({ error: 'Accès réservé aux patients' });
        next();
    });
};


export const authenticateProfessional = (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
        if (req.role === 'PATIENT') return res.status(403).json({ error: 'Accès réservé au personnel médical' });
        next();
    });
};


export const authenticateSousAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
        if (req.role !== 'SOUS_ADMIN') return res.status(403).json({ error: 'Accès réservé aux sous-administrateurs' });
        next();
    });
};


export const authenticateAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
        if (req.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        next();
    });
};
