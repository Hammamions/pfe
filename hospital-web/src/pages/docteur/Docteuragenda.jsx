import { Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import api from '../../lib/api';
import { mockDoctorAppointments, mockWaitingRoom } from '../../data/doctorMockData';

export default function DoctorAgendaPage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [appointments, setAppointments] = useState(mockDoctorAppointments);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [liveWaitingRoom, setLiveWaitingRoom] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchWaitingRoom = async () => {
            try {
                const res = await api.get('/professionals/doctor-waiting-room', { params: { _t: Date.now() } });
                if (!isMounted) return;
                setLiveWaitingRoom(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                if (!isMounted) return;
                console.error('Error fetching doctor waiting room:', error);
            }
        };

        fetchWaitingRoom();
        const intervalId = setInterval(fetchWaitingRoom, 3000);
        window.addEventListener('focus', fetchWaitingRoom);
        document.addEventListener('visibilitychange', fetchWaitingRoom);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('focus', fetchWaitingRoom);
            document.removeEventListener('visibilitychange', fetchWaitingRoom);
        };
    }, []);

    const handleRescheduleClick = (appointment) => {
        setSelectedAppointment(appointment);
        setNewDate(selectedDate);
        setNewTime(appointment.heure);
        setIsRescheduleOpen(true);
    };

    const confirmReschedule = () => {
        if (!selectedAppointment) return;

        const updatedAppointments = appointments.map(apt => {
            if (apt.id === selectedAppointment.id) {
                return {
                    ...apt,
                    rescheduleStatus: 'pending',
                    requestedDate: newDate,
                    requestedTime: newTime
                };
            }
            return apt;
        });

        setAppointments(updatedAppointments);
        setIsRescheduleOpen(false);
        setSelectedAppointment(null);
    };

    const timeSlots = Array.from({ length: 12 }, (_, i) => {
        const hour = i + 8;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const workingDays = [true, true, true, true, true, false, false];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
                </div>
            </div>

            <Tabs defaultValue="daily" className="w-full">
                <TabsList>
                    <TabsTrigger value="daily">Vue journalière</TabsTrigger>
                    <TabsTrigger value="weekly">Vue hebdomadaire</TabsTrigger>
                    <TabsTrigger value="waiting">Salle d'attente</TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Planning du {selectedDate}</CardTitle>
                                    <CardDescription>Vos rendez-vous de la journée</CardDescription>
                                </div>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {timeSlots.map((time) => {
                                    const appointment = appointments.find(
                                        (apt) => apt.heure === time
                                    );
                                    return (
                                        <div
                                            key={time}
                                            className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-20 font-semibold text-gray-700">{time}</div>
                                            {appointment ? (
                                                <>
                                                    <div
                                                        className="flex-1 flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                                                        onClick={() => handleRescheduleClick(appointment)}
                                                        title="Cliquez pour reprogrammer"
                                                    >
                                                        <div className={`w-1 h-12 rounded-full ${appointment.rescheduleStatus === 'pending' ? 'bg-orange-500' : 'bg-blue-600'
                                                            }`} />
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {appointment.patient.prenom} {appointment.patient.nom}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {appointment.motif}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    Salle {appointment.salle} • {appointment.duree} min
                                                                </p>
                                                                {appointment.rescheduleStatus === 'pending' && (
                                                                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50">
                                                                        Reprogrammation demandée
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            appointment.statut === 'en cours'
                                                                ? 'default'
                                                                : appointment.statut === 'terminé'
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                        }
                                                    >
                                                        {appointment.statut}
                                                    </Badge>
                                                </>
                                            ) : (

                                                <div className="flex-1 text-gray-400 text-sm">Disponible</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="weekly" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vue hebdomadaire</CardTitle>
                            <CardDescription>Aperçu de votre semaine</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px]">
                                    <div className="grid grid-cols-8 gap-2 mb-2">
                                        <div className="font-semibold text-sm text-gray-600">Horaire</div>
                                        {daysOfWeek.map((day) => (
                                            <div
                                                key={day}
                                                className="font-semibold text-sm text-center text-gray-900"
                                            >
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    {timeSlots.slice(0, 10).map((time) => (
                                        <div key={time} className="grid grid-cols-8 gap-2 mb-1">
                                            <div className="text-sm text-gray-600 py-2">{time}</div>
                                            {daysOfWeek.map((day, idx) => {
                                                const hasAppointment = idx < 5 && Math.random() > 0.6;
                                                return (
                                                    <div
                                                        key={day}
                                                        className={`rounded p-2 text-xs ${hasAppointment
                                                            ? 'bg-blue-100 border border-blue-300 cursor-pointer hover:bg-blue-200'
                                                            : workingDays[idx]
                                                                ? 'bg-gray-50 border border-gray-200'
                                                                : 'bg-gray-100 opacity-50'
                                                            }`}
                                                    >
                                                        {hasAppointment && (
                                                            <div className="font-medium text-blue-900 truncate">
                                                                Patient
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>



                <TabsContent value="waiting" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Salle d'attente en temps réel
                                    </CardTitle>
                                    <CardDescription>Patients actuellement en attente</CardDescription>
                                </div>
                                <Badge variant="secondary">{liveWaitingRoom.length} patient(s)</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {liveWaitingRoom.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="p-4 rounded-lg border-2 border-blue-300 bg-blue-50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-gray-900">
                                                        {patient.patientName}
                                                    </h4>
                                                    <Badge variant="default" className="text-xs">présent</Badge>
                                                </div>
                                                <p className="text-sm text-gray-600">{patient.motif || 'Consultation'}</p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Heure: {patient.heure}</span>
                                                    <span>•</span>
                                                    <span>{patient.lieu} • Salle {patient.salle}</span>
                                                </div>
                                                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                                                    <p><span className="font-semibold">Groupe sanguin:</span> {patient.dossierMedical?.bloodGroup || 'Non précisé'}</p>
                                                    <p><span className="font-semibold">Allergies:</span> {(patient.dossierMedical?.allergies || []).join(', ') || 'Aucune'}</p>
                                                    <p><span className="font-semibold">Antécédents:</span> {(patient.dossierMedical?.history || []).slice(0, 3).join(', ') || 'Aucun'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {liveWaitingRoom.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">Aucun patient présent en salle d'attente.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reprogrammer le rendez-vous</DialogTitle>
                        <DialogDescription>
                            Proposer un nouvel horaire pour {selectedAppointment?.patient?.prenom} {selectedAppointment?.patient?.nom}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">
                                Heure
                            </Label>
                            <Input
                                id="time"
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Annuler</Button>
                        <Button onClick={confirmReschedule}>Confirmer la demande</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
