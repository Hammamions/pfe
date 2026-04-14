import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendResetEmail } from '../utils/mail';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tunisante_secret_key_2026';

router.post('/register', async (req: Request, res: Response) => {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    try {
        const existing = await prisma.utilisateur.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }

        const nameParts = fullName.trim().split(' ');
        const prenom = nameParts[0] || fullName;
        const nom = nameParts.slice(1).join(' ') || fullName;

        const hashedPassword = await bcrypt.hash(password, 10);

        let assignedRole = 'PATIENT';
        if (role === 'MEDECIN') assignedRole = 'MEDECIN';
        if (role === 'ADMIN') assignedRole = 'ADMIN';
        if (role === 'SOUS_ADMIN') assignedRole = 'SOUS_ADMIN';

        const userData: any = {
            email,
            motDePasse: hashedPassword,
            nom,
            prenom,
            role: assignedRole,
        };

        if (assignedRole === 'PATIENT') {
            userData.patient = { create: {} };
        } else if (assignedRole === 'MEDECIN') {
            userData.medecin = { create: {} };
        } else if (assignedRole === 'ADMIN') {
            userData.admin = { create: {} };
        } else if (assignedRole === 'SOUS_ADMIN') {
            userData.sousAdmin = { create: {} };
        }

        const utilisateur = await prisma.utilisateur.create({
            data: userData
        });

        const token = jwt.sign({ userId: utilisateur.id, email: utilisateur.email, role: utilisateur.role }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            token,
            user: {
                id: utilisateur.id,
                email: utilisateur.email,
                role: utilisateur.role,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                lastName: utilisateur.nom,
                firstName: utilisateur.prenom
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        const utilisateur = await prisma.utilisateur.findUnique({
            where: { email },
            include: {
                patient: { include: { dossierMedical: true } },
                medecin: true,
                admin: true,
                sousAdmin: true
            }
        });

        if (!utilisateur) {
            return res.status(401).json({ error: 'Compte non trouvé pour cet email' });
        }

        const isValid = await bcrypt.compare(password, utilisateur.motDePasse);
        if (!isValid) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        const token = jwt.sign({ userId: utilisateur.id, email: utilisateur.email, role: utilisateur.role }, JWT_SECRET, { expiresIn: '7d' });

        let extras: any = {};
        if (utilisateur.role === 'PATIENT' && utilisateur.patient) {
            const d = utilisateur.patient.dossierMedical;
            extras = {
                birthDate: d?.dateNaissance || '',
                bloodGroup: d?.groupeSanguin || '',
                socialSecurity: d?.numSecuriteSociale || '',
                allergies: d?.allergies || [],
                history: d?.historiqueMedical || [],
                emergencyContact: {
                    name: d?.contactUrgenceNom || '',
                    relation: '',
                    phone: d?.contactUrgenceTelephone || '',
                    email: d?.contactUrgenceEmail || ''
                }
            };
        } else if (utilisateur.role === 'MEDECIN' && utilisateur.medecin) {
            extras = {
                specialite: utilisateur.medecin.specialite
            };
        }

        return res.json({
            token,
            user: {
                email: utilisateur.email,
                role: utilisateur.role,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                lastName: utilisateur.nom,
                firstName: utilisateur.prenom,
                ...extras
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});

router.put('/profile', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, email: string };

        const {
            lastName,
            firstName,
            phone,
            birthDate,
            bloodGroup,
            socialSecurity,
            allergies,
            history,
            emergencyContact
        } = req.body;

        const utilisateur = await prisma.utilisateur.update({
            where: { id: decoded.userId },
            data: {
                nom: lastName || undefined,
                prenom: firstName || undefined
            },
            include: { patient: true }
        });

        if (utilisateur.patient) {
            await prisma.patient.update({
                where: { id: utilisateur.patient.id },
                data: {
                    telephone: phone || undefined,
                }
            });

            await prisma.dossierMedical.upsert({
                where: { patientId: utilisateur.patient.id },
                create: {
                    patientId: utilisateur.patient.id,
                    dateNaissance: birthDate,
                    groupeSanguin: bloodGroup,
                    numSecuriteSociale: socialSecurity,
                    allergies: allergies || [],
                    historiqueMedical: history || [],
                    contactUrgenceNom: emergencyContact?.name,
                    contactUrgenceRelation: emergencyContact?.relation,
                    contactUrgenceTelephone: emergencyContact?.phone,
                    contactUrgenceEmail: emergencyContact?.email
                },
                update: {
                    dateNaissance: birthDate || undefined,
                    groupeSanguin: bloodGroup || undefined,
                    numSecuriteSociale: socialSecurity || undefined,
                    allergies: allergies || undefined,
                    historiqueMedical: history || undefined,
                    contactUrgenceNom: emergencyContact?.name || undefined,
                    contactUrgenceRelation: emergencyContact?.relation || undefined,
                    contactUrgenceTelephone: emergencyContact?.phone || undefined,
                    contactUrgenceEmail: emergencyContact?.email || undefined,
                }
            });
        }

        return res.json({
            message: 'Profil mis à jour avec succès',
            user: {
                email: utilisateur.email,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

router.post('/register-full', async (req: Request, res: Response) => {
    const { userData, profileData } = req.body;

    if (!userData || !profileData) {
        return res.status(400).json({ error: 'Données incomplètes' });
    }

    try {
        const existing = await prisma.utilisateur.findUnique({ where: { email: userData.email } });
        if (existing) {
            return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const utilisateur = await prisma.utilisateur.create({
            data: {
                email: userData.email,
                motDePasse: hashedPassword,
                nom: profileData.lastName || '',
                prenom: profileData.firstName || '',
                role: 'PATIENT',
                patient: {
                    create: {
                        telephone: profileData.phone,
                        dossierMedical: {
                            create: {
                                dateNaissance: profileData.birthDate,
                                groupeSanguin: profileData.bloodGroup,
                                numSecuriteSociale: profileData.socialSecurity,
                                allergies: profileData.allergies || [],
                                historiqueMedical: profileData.history || [],
                                contactUrgenceNom: profileData.emergencyContact?.name,
                                contactUrgenceRelation: profileData.emergencyContact?.relation,
                                contactUrgenceTelephone: profileData.emergencyContact?.phone,
                                contactUrgenceEmail: profileData.emergencyContact?.email
                            }
                        }
                    }
                }
            }
        });

        const token = jwt.sign({ userId: utilisateur.id, email: utilisateur.email, role: 'PATIENT' }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            token,
            user: {
                email: utilisateur.email,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                lastName: utilisateur.nom,
                firstName: utilisateur.prenom
            }
        });
    } catch (error) {
        console.error('Full Register error:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du compte' });
    }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'L\'email est requis' });

    try {
        const user = await prisma.utilisateur.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'Aucun compte associé à cet email' });

        const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `http://192.168.1.3:4000/reset-password?token=${resetToken}`;
        await sendResetEmail(email, resetLink);

        return res.json({ message: 'Un lien de récupération a été envoyé à votre adresse email.', success: true });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ error: 'Erreur lors de la demande de récupération' });
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Données manquantes' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.utilisateur.update({
            where: { email: decoded.email },
            data: { motDePasse: hashedPassword }
        });
        return res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
});

export default router;
