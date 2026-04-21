require('dotenv').config();
const nodemailer = require('nodemailer');

const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass }
});

(async () => {
    await t.verify();
    const to = process.argv[2] || process.env.SMTP_USER;
    const info = await t.sendMail({
        from: `"TuniSanté" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Test SMTP reset',
        text: 'Si vous lisez ceci, SMTP fonctionne.',
        html: '<p>Si vous lisez ceci, <strong>SMTP</strong> fonctionne.</p>'
    });
    console.log('OK', info.messageId, info.response);
})().catch((e) => {
    console.error('FAIL', e.message, e.response);
    process.exit(1);
});
