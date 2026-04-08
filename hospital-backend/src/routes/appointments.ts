import { PrismaClient } from '@prisma/client';
import { Response, Router } from 'express';
import { authenticatePatient, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();



router.get('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const now = new Date();
        const appointments = await prisma.rendezVous.findMany({
            where: { patientId: patient.id },
            include: {
                medecin: { include: { utilisateur: true } }
            },
            orderBy: { date: 'asc' }
        });

        const formatted = appointments.map(apt => {
            const dateObj = new Date(apt.date);
            let status = apt.statut.toLowerCase();
            if (apt.statut === 'CONFIRME' && dateObj < now) status = 'termine';
            if (apt.motif?.startsWith('[ANNULER]')) status = 'demande_annulation';

            return {
                id: apt.id,
                date: dateObj.getDate().toString(),
                month: dateObj.toLocaleString('fr-FR', { month: 'short' }).replace('.', ''),
                year: dateObj.getFullYear().toString(),
                time: dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                doctor: apt.medecin
                    ? `Dr. ${apt.medecin.utilisateur.prenom} ${apt.medecin.utilisateur.nom}`
                    : 'Médecin à définir',
                specialty: apt.medecin?.specialite || (apt.motif?.includes('[SPEC:') ? apt.motif.split('[SPEC:')[1].split(']')[0] : ''),
                location: apt.lieu || 'Hôpital Sahloul Sousse',
                room: apt.salle || 'À définir',
                status,
                motif: apt.motif
                    ? apt.motif.replace(/\[SPEC:.*?\]/, '').replace('[ANNULER]', '').trim()
                    : '',
                isUrgent: apt.isUrgent,
                presenceStatus: apt.presenceStatus
            };
        });

        return res.json(formatted);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { doctorId, reason, date, isUrgent } = req.body;
    try {
        const patient = await prisma.patient.findUnique({
            where: { utilisateurId: req.userId },
            include: { utilisateur: true }
        });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const appointmentDate = date
            ? new Date(date)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const specialty = req.body.specialty || '';
        const finalMotif = specialty ? `[SPEC:${specialty}] ${reason || ''}` : reason;


        let assignedSousAdminId: number | null = null;
        let cardiologySousAdmins: any[] = [];

        if (specialty === 'cardiology' || specialty === 'Cardiologie') {
            cardiologySousAdmins = await prisma.sousAdmin.findMany({
                where: {
                    OR: [
                        { specialite: 'cardiology' },
                        { specialite: 'Cardiologie' }
                    ]
                } as any,
                include: { utilisateur: true }
            });

            if (cardiologySousAdmins.length > 0) {
                assignedSousAdminId = cardiologySousAdmins[0].id;
            }
        }

        console.log(`[Backend] Creating appointment for patientId: ${patient.id}, userId: ${req.userId}`);
        const newApt = await prisma.rendezVous.create({
            data: {
                patientId: patient.id,
                medecinId: doctorId ? parseInt(doctorId) : null,
                motif: finalMotif || null,
                specialite: specialty || null,
                date: appointmentDate,
                isUrgent: !!isUrgent,
                statut: 'EN_ATTENTE',
                sousAdminId: assignedSousAdminId
            }
        });
        console.log(`[Backend] Appointment created successfully with ID: ${newApt.id} (Assigned to SA: ${assignedSousAdminId})`);

        await prisma.notification.create({
            data: {
                utilisateurId: req.userId!,
                titre: 'Demande de rendez-vous reçue',
                message: `Votre demande de rendez-vous pour le ${appointmentDate.toLocaleDateString('fr-FR')} a bien été enregistrée.`
            }
        });

        if (assignedSousAdminId) {
            const sa = cardiologySousAdmins.find(admin => admin.id === assignedSousAdminId);
            if (sa) {
                await prisma.notification.create({
                    data: {
                        utilisateurId: sa.utilisateur.id,
                        titre: '📌 Nouvelle demande assignée (Cardio)',
                        message: `Le patient ${patient.utilisateur.prenom} ${patient.utilisateur.nom} a envoyé une demande en Cardiologie. Elle vous a été automatiquement assignée.`
                    }
                });
            }
        }

        return res.status(201).json({ message: 'Demande de rendez-vous reçue', appointment: newApt });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.put('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, date: newDate } = req.body;

    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        const appointment = await prisma.rendezVous.findFirst({
            where: { id: parseInt(id as string), patientId: patient.id }
        });
        if (!appointment) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

        let finalStatus: any = status;
        let finalMotif = appointment.motif;
        let finalDate = appointment.date;

        if (newDate) finalDate = new Date(newDate);

        if (appointment.statut === 'CONFIRME' && status === 'ANNULE') {
            finalStatus = 'REPORTE';
            finalMotif = `[ANNULER] ${appointment.motif || ''}`;
        }

        const updated = await prisma.rendezVous.update({
            where: { id: parseInt(id as string) },
            data: { statut: finalStatus, motif: finalMotif, date: finalDate }
        });

        return res.json({ message: 'Statut mis à jour', appointment: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});


router.delete('/:id', authenticatePatient, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const patient = await prisma.patient.findUnique({ where: { utilisateurId: req.userId } });
        if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

        await prisma.rendezVous.deleteMany({
            where: { id: parseInt(id as string), patientId: patient.id }
        });

        return res.json({ message: 'Rendez-vous supprimé' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
