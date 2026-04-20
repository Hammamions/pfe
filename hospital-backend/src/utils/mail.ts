import nodemailer from 'nodemailer';
import https from 'https';
import querystring from 'querystring';

const smtpPassNormalized = () => {
    const raw = process.env.SMTP_PASS;
    if (!raw) return '';
    const stripped = String(raw).replace(/\s+/g, '');
    return stripped || String(raw).trim();
};

const createTransporter = () =>
    nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: smtpPassNormalized()
        }
    });

const normalizePhoneToE164 = (rawPhone: string) => {
    const cleaned = String(rawPhone || '').replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned;
    if (/^\d{8}$/.test(cleaned)) return `+216${cleaned}`;
    if (/^216\d{8}$/.test(cleaned)) return `+${cleaned}`;
    return '';
};

export const sendResetEmail = async (to: string, resetLink: string) => {
    require('dotenv').config();
    const transporter = createTransporter();
    const toTrimmed = String(to || '').trim();
    if (!toTrimmed) {
        throw new Error('Adresse destinataire vide pour le mail de réinitialisation');
    }

    const textBody =
        `TuniSanté — réinitialisation du mot de passe\n\n` +
        `Ouvrez ce lien dans votre navigateur (valide 1 h) :\n${resetLink}\n\n` +
        `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;

    const mailOptions = {
        from: `"TuniSanté" <${process.env.SMTP_USER}>`,
        to: toTrimmed,
        subject: 'Réinitialisation de votre mot de passe - TuniSanté',
        text: textBody,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">TuniSanté</h2>
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte TuniSanté.</p>
                <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
                </div>
                <p>Ce lien expirera dans une heure.</p>
                <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 TuniSanté. Votre santé, notre priorité.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[MAIL][RESET] sent to=', toTrimmed, 'messageId=', info.messageId, 'response=', info.response);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[MAIL][RESET] Error sending to=', toTrimmed, error);
        throw error;
    }
};

export const sendAccountCredentialsEmail = async (
    to: string,
    fullName: string,
    accountEmail: string,
    plainPassword: string,
    roleLabel: string
) => {
    require('dotenv').config();
    const transporter = createTransporter();

    const mailOptions = {
        from: `"TuniSanté" <${process.env.SMTP_USER}>`,
        to,
        subject: `Identifiants de votre compte ${roleLabel} - TuniSanté`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">TuniSanté</h2>
                <p>Bonjour ${fullName},</p>
                <p>Votre compte ${roleLabel} a été créé avec succès.</p>
                <p>Voici vos identifiants de connexion :</p>
                <ul style="line-height: 1.8;">
                    <li><strong>Adresse email:</strong> ${accountEmail}</li>
                    <li><strong>Mot de passe:</strong> ${plainPassword}</li>
                </ul>
                <p>Veuillez vous connecter puis changer votre mot de passe dès la première connexion.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 TuniSanté. Votre santé, notre priorité.</p>
            </div>
        `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
};

export const sendAccountSetupEmail = async (
    to: string,
    fullName: string,
    accountEmail: string,
    roleLabel: string,
    resetLink: string
) => {
    require('dotenv').config();
    const transporter = createTransporter();

    const mailOptions = {
        from: `"TuniSanté" <${process.env.SMTP_USER}>`,
        to,
        subject: `Activation de votre compte ${roleLabel} - TuniSanté`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">TuniSanté</h2>
                <p>Bonjour ${fullName},</p>
                <p>Votre compte ${roleLabel} a été créé avec succès.</p>
                <p><strong>Adresse email de connexion:</strong> ${accountEmail}</p>
                <p>Pour définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Définir mon mot de passe</a>
                </div>
                <p>Ce lien expirera dans une heure.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 TuniSanté. Votre santé, notre priorité.</p>
            </div>
        `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
};

export const sendAccountCredentialsSms = async (
    toPhone: string,
    accountEmail: string,
    plainPassword: string
) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
        throw new Error('Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER');
    }

    const normalizedPhone = normalizePhoneToE164(toPhone);
    if (!normalizedPhone) {
        throw new Error('Invalid phone format for SMS. Expected E.164 (e.g. +216XXXXXXXX)');
    }

    const body = querystring.stringify({
        To: normalizedPhone,
        From: from,
        Body: `TuniSante - Vos identifiants: email ${accountEmail} | mot de passe ${plainPassword}`
    });

    await new Promise<void>((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'api.twilio.com',
                path: `/2010-04-01/Accounts/${sid}/Messages.json`,
                method: 'POST',
                auth: `${sid}:${token}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Twilio SMS failed (${res.statusCode}): ${data}`));
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

export const sendAccountSetupSms = async (
    toPhone: string,
    accountEmail: string,
    resetLink: string
) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
        throw new Error('Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER');
    }

    const normalizedPhone = normalizePhoneToE164(toPhone);
    if (!normalizedPhone) {
        throw new Error('Invalid phone format for SMS. Expected E.164 (e.g. +216XXXXXXXX)');
    }

    const body = querystring.stringify({
        To: normalizedPhone,
        From: from,
        Body: `TuniSante - Compte cree (${accountEmail}). Definissez votre mot de passe ici: ${resetLink}`
    });

    await new Promise<void>((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'api.twilio.com',
                path: `/2010-04-01/Accounts/${sid}/Messages.json`,
                method: 'POST',
                auth: `${sid}:${token}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Twilio SMS failed (${res.statusCode}): ${data}`));
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};