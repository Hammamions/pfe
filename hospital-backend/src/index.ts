import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import appointmentsRouter from './routes/appointments';
import authRouter from './routes/auth';
import feedbackRouter from './routes/feedback';
import guidanceRouter from './routes/guidance';
import medicalDocumentsRouter from './routes/medical-documents';
import patientsRouter from './routes/patients';
import professionalsRouter from './routes/professionals';
import sousAdminRouter from './routes/sous-admin';
import urgenceRouter from './routes/urgence';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (from ${req.ip})`);
    next();
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    if (req.method !== 'GET') console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
});


app.use('/api/auth', authRouter);


app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/documents', medicalDocumentsRouter);
app.use('/api/medical-documents', medicalDocumentsRouter);
app.use('/api/urgence', urgenceRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/guidance', guidanceRouter);


app.use('/api/professionals', professionalsRouter);


app.use('/api/sous-admin', sousAdminRouter);
app.get('/reset-password', (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h1>Lien invalide ou expiré</h1>');

    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialiser mon mot de passe - TuniSanté</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background:#f0f4f8; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
            .card { background:white; padding:2rem; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1); width:100%; max-width:400px; text-align:center; }
            h2 { color:#1e3a8a; margin-bottom:1.5rem; }
            input { width:100%; padding:12px; margin-bottom:1rem; border:1px solid #d1d5db; border-radius:8px; box-sizing:border-box; }
            button { width:100%; background:#2563eb; color:white; padding:12px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; }
            button:hover { background:#1d4ed8; }
            .message { margin-top:1rem; font-size:14px; display:none; }
            .success { color:#059669; } .error { color:#dc2626; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Nouveau mot de passe</h2>
            <p>Saisissez votre nouveau mot de passe pour <strong>TuniSanté</strong>.</p>
            <input type="password" id="password" placeholder="Nouveau mot de passe" required>
            <input type="password" id="confirm" placeholder="Confirmer le mot de passe" required>
            <button onclick="submitForm()">Enregistrer</button>
            <div id="status" class="message"></div>
        </div>
        <script>
            async function submitForm() {
                const pass = document.getElementById('password').value;
                const conf = document.getElementById('confirm').value;
                const status = document.getElementById('status');
                if (pass !== conf) { status.innerText='Les mots de passe ne correspondent pas.'; status.className='message error'; status.style.display='block'; return; }
                if (pass.length < 8) { status.innerText='Le mot de passe doit faire au moins 8 caractères.'; status.className='message error'; status.style.display='block'; return; }
                try {
                    const res = await fetch('/api/auth/reset-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ token:'${token}', newPassword:pass }) });
                    const data = await res.json();
                    if (res.ok) { status.innerText='Mot de passe mis à jour ! Vous pouvez vous connecter.'; status.className='message success'; document.querySelector('button').style.display='none'; }
                    else { status.innerText=data.error||'Une erreur est survenue.'; status.className='message error'; }
                    status.style.display='block';
                } catch(e) { status.innerText='Erreur de connexion.'; status.className='message error'; status.style.display='block'; }
            }
        </script>
    </body>
    </html>`;
    res.send(html);
});

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'TuniSanté API is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Routes: /api/auth | /api/patients | /api/appointments | /api/documents | /api/urgence | /api/feedback | /api/professionals | /api/sous-admin`);
});
