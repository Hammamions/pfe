import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Database,
    FileText as FileTextIcon,
    HardDrive,
    RefreshCw,
    Server
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const defaultSurveillance = {
    cpu: 45,
    memory: { used: 6.2, total: 16 },
    disk: { used: 234, total: 500 },
    responseTime: 124,
    requestsPerMin: 2345,
    errors: 3,
    uptime: 99.9,
    services: {
        database: 'operational',
        api: 'operational',
        auth: 'operational',
        notifications: 'degraded'
    }
};

export default function AdminSystemPage() {
    const [surveillanceData, setSurveillanceData] = useState(defaultSurveillance);
    const [monthlyStats, setMonthlyStats] = useState({
        consultations: 0,
        ordonnances: 0,
        uploadedDocuments: 0,
        satisfactionRate: 0
    });
    const [showLogs, setShowLogs] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

    const fetchSurveillanceData = async () => {
        const surveillanceResponse = await api.get('/admin/system-surveillance');
        const payload = surveillanceResponse?.data ?? {};
        setSurveillanceData((prev) => ({
            ...prev,
            ...payload,
            memory: {
                used: Number(payload?.memory?.used ?? prev.memory.used),
                total: Number(payload?.memory?.total ?? prev.memory.total)
            },
            disk: {
                used: Number(payload?.disk?.used ?? prev.disk.used),
                total: Number(payload?.disk?.total ?? prev.disk.total)
            }
        }));
        setLastRefreshTime(new Date());
    };

    const fetchMonthlyStats = async () => {
        const response = await api.get('/admin/monthly-stats');
        const payload = response?.data ?? {};
        setMonthlyStats({
            consultations: Number(payload.consultations ?? 0),
            ordonnances: Number(payload.ordonnances ?? 0),
            uploadedDocuments: Number(payload.uploadedDocuments ?? 0),
            satisfactionRate: Number(payload.satisfactionRate ?? 0)
        });
    };

    const fetchSystemLogs = async () => {
        const response = await api.get('/admin/system-logs');
        const logs = Array.isArray(response?.data) ? response.data : [];
        setSystemLogs(logs);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchSurveillanceData(), fetchMonthlyStats()]);
        } catch (err) {
            console.error('Failed to refresh system data:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleViewLogs = () => {
        const nextValue = !showLogs;
        setShowLogs(nextValue);
        if (nextValue) {
            fetchSystemLogs().catch((err) => {
                console.error('Failed to fetch system logs:', err);
            });
        }
    };

    const getServiceStatusColor = (status) => {
        switch (status) {
            case 'operational':
                return 'text-green-600';
            case 'degraded':
                return 'text-yellow-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getServiceStatusIcon = (status) => {
        switch (status) {
            case 'operational':
                return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'degraded':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            case 'down':
                return <AlertCircle className="w-4 h-4 text-red-600" />;
            default:
                return null;
        }
    };

    useEffect(() => {
        fetchSurveillanceData().catch((err) => {
            console.error('Failed to fetch system surveillance data:', err);
        });
        fetchMonthlyStats().catch((err) => {
            console.error('Failed to fetch monthly stats:', err);
        });

        const timer = setInterval(() => {
            fetchSurveillanceData().catch((err) => {
                console.error('Failed to refresh system surveillance data:', err);
            });
            fetchMonthlyStats().catch((err) => {
                console.error('Failed to refresh monthly stats:', err);
            });
        }, 30_000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Surveillance &amp; système</h1>
                    <p className="text-gray-500 mt-2">Métriques infrastructure, services et statistiques mensuelles</p>
                </div>
                <Button variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Rafraîchissement…' : 'Rafraîchir'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-600" />
                                Surveillance système
                            </CardTitle>
                            <CardDescription>Dernière mise à jour : {lastRefreshTime.toLocaleTimeString('fr-FR')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Utilisation CPU</span>
                                <span className="font-medium text-gray-900">{surveillanceData.cpu}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        surveillanceData.cpu > 80 ? 'bg-red-600' : surveillanceData.cpu > 60 ? 'bg-yellow-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${surveillanceData.cpu}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Utilisation mémoire</span>
                                <span className="font-medium text-gray-900">
                                    {surveillanceData.memory.used} GB / {surveillanceData.memory.total} GB
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        (surveillanceData.memory.used / surveillanceData.memory.total) * 100 > 80
                                            ? 'bg-red-600'
                                            : (surveillanceData.memory.used / surveillanceData.memory.total) * 100 > 60
                                              ? 'bg-yellow-600'
                                              : 'bg-green-600'
                                    }`}
                                    style={{ width: `${(surveillanceData.memory.used / surveillanceData.memory.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Espace disque</span>
                                <span className="font-medium text-gray-900">
                                    {surveillanceData.disk.used} GB / {surveillanceData.disk.total} GB
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        (surveillanceData.disk.used / surveillanceData.disk.total) * 100 > 85
                                            ? 'bg-red-600'
                                            : (surveillanceData.disk.used / surveillanceData.disk.total) * 100 > 70
                                              ? 'bg-yellow-600'
                                              : 'bg-purple-600'
                                    }`}
                                    style={{ width: `${(surveillanceData.disk.used / surveillanceData.disk.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-3">État des services</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Base de données</span>
                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.database)}`}>
                                        {getServiceStatusIcon(surveillanceData.services.database)}
                                        {surveillanceData.services.database === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">API REST</span>
                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.api)}`}>
                                        {getServiceStatusIcon(surveillanceData.services.api)}
                                        {surveillanceData.services.api === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Service d&apos;authentification</span>
                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.auth)}`}>
                                        {getServiceStatusIcon(surveillanceData.services.auth)}
                                        {surveillanceData.services.auth === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Service de notifications</span>
                                    <span className={`flex items-center gap-1 text-sm ${getServiceStatusColor(surveillanceData.services.notifications)}`}>
                                        {getServiceStatusIcon(surveillanceData.services.notifications)}
                                        {surveillanceData.services.notifications === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-3">Métriques de performance</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Temps de réponse</p>
                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.responseTime}ms</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Requêtes/min</p>
                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.requestsPerMin.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Erreurs (24h)</p>
                                    <p className={`text-lg font-bold ${surveillanceData.errors > 10 ? 'text-red-600' : 'text-green-600'}`}>
                                        {surveillanceData.errors}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Uptime</p>
                                    <p className="text-lg font-bold text-gray-900">{surveillanceData.uptime}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleViewLogs}>
                                <FileTextIcon className="w-4 h-4" />
                                {showLogs ? 'Masquer les logs' : 'Voir les logs'}
                            </Button>
                        </div>

                        {showLogs && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium text-gray-900 mb-3">Logs système</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {systemLogs.map((log, index) => (
                                        <div key={index} className="p-2 bg-gray-50 rounded text-xs font-mono">
                                            <div className="flex items-start gap-2">
                                                <span className="text-gray-400 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                                                </span>
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                                        log.level === 'error'
                                                            ? 'bg-red-100 text-red-700'
                                                            : log.level === 'warning'
                                                              ? 'bg-yellow-100 text-yellow-700'
                                                              : 'bg-blue-100 text-blue-700'
                                                    }`}
                                                >
                                                    {log.level}
                                                </span>
                                                <span className="text-gray-700">{log.message}</span>
                                            </div>
                                            {(log.user || log.ip || log.size || log.endpoint) && (
                                                <div className="mt-1 text-gray-500">
                                                    {log.user && <span>Utilisateur: {log.user} </span>}
                                                    {log.ip && <span>IP: {log.ip} </span>}
                                                    {log.size && <span>Taille: {log.size} </span>}
                                                    {log.endpoint && <span>Endpoint: {log.endpoint}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {systemLogs.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">Aucun log système disponible</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>État du système</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Database className="w-4 h-4" />
                                    Base de données
                                </div>
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                        surveillanceData.services.database === 'operational'
                                            ? 'text-green-600 bg-green-50'
                                            : 'text-yellow-700 bg-yellow-50'
                                    }`}
                                >
                                    {surveillanceData.services.database === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Server className="w-4 h-4" />
                                    API Backend
                                </div>
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                        surveillanceData.services.api === 'operational'
                                            ? 'text-green-600 bg-green-50'
                                            : 'text-yellow-700 bg-yellow-50'
                                    }`}
                                >
                                    {surveillanceData.services.api === 'operational' ? 'Opérationnel' : 'Charge élevée'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <HardDrive className="w-4 h-4" />
                                    Stockage
                                </div>
                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                                    {Math.round((surveillanceData.disk.used / surveillanceData.disk.total) * 100)}% utilisé
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    Dernière mise à jour des métriques
                                </div>
                                <span className="text-gray-500 text-xs">{lastRefreshTime.toLocaleTimeString('fr-FR')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Statistiques du mois</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Consultations</span>
                                <span className="font-bold text-gray-900">{monthlyStats.consultations.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Ordonnances</span>
                                <span className="font-bold text-gray-900">{monthlyStats.ordonnances.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Documents envoyés aux patients</span>
                                <span className="font-bold text-gray-900">{monthlyStats.uploadedDocuments.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Taux satisfaction</span>
                                <span className="font-bold text-green-600">{monthlyStats.satisfactionRate}%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
