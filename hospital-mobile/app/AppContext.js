import Constants from 'expo-constants';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import AsyncStorage from './utils/storage';

const AppContext = createContext();

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const AppProvider = ({ children }) => {
    const notifiedBackendIdsRef = useRef(new Set());
    const [patient, setPatient] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        birthDate: "",
        bloodGroup: "",
        allergies: [],
        history: [],
        treatingDoctor: "",
        socialSecurity: "",
        emergencyContact: {
            name: "",
            phone: "",
            relation: "",
            email: ""
        },
        patientSince: "",
    });

    const getRelativeDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const day = d.getDate().toString();
        const monthNames = ["january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"];
        const month = monthNames[d.getMonth()];
        const fullDate = d.toLocaleDateString('fr-FR');
        return { day, month, fullDate };
    };

    const d1 = getRelativeDate(3);
    const d2 = getRelativeDate(10);
    const d3 = getRelativeDate(16);
    const past1 = getRelativeDate(-5);
    const past2 = getRelativeDate(-12);
    const past3 = getRelativeDate(-20);

    const [appointments, setAppointments] = useState([]);
    const [requests, setRequests] = useState([]);
    const [history, setHistory] = useState([]);

    const [documents, setDocuments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [services, setServices] = useState([]);
    const [equipments, setEquipments] = useState([]);

    const API_URL = (() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const webHost = window.location.hostname || 'localhost';
            return `http://${webHost}:4000`;
        }

        const hostUri =
            Constants.expoConfig?.hostUri ||
            Constants.manifest2?.extra?.expoGo?.debuggerHost ||
            '';
        const host = hostUri.split(':')[0];

        if (host) return `http://${host}:4000`;
        if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
        return 'http://localhost:4000';
    })();

    const loadData = async () => {
        try {
            const savedPatient = await AsyncStorage.getItem('patient');
            if (savedPatient) {
                const parsed = JSON.parse(savedPatient);
                setPatient(prev => ({
                    ...prev,
                    ...parsed,
                    allergies: parsed.allergies || [],
                    history: parsed.history || [],
                    emergencyContact: {
                        ...(prev.emergencyContact || {}),
                        ...(parsed.emergencyContact || {})
                    }
                }));
            }
        } catch (e) {
            console.warn("Failed to load patient data", e);
        }
    };

    const loadGuidanceData = async () => {
        try {
            const guiRes = await fetch(`${API_URL}/api/guidance`);
            if (guiRes.ok) {
                const data = await guiRes.json();
                const allowedIcons = new Set([
                    'activity', 'airplay', 'alert-circle', 'archive', 'award', 'briefcase',
                    'calendar', 'camera', 'check-circle', 'clock', 'coffee', 'crosshair',
                    'droplet', 'edit', 'eye', 'file', 'file-text', 'flag', 'heart', 'help-circle',
                    'home', 'image', 'info', 'layers', 'map', 'map-pin', 'navigation',
                    'package', 'phone', 'plus-circle', 'search', 'shield', 'shopping-bag',
                    'star', 'tool', 'truck', 'user', 'users', 'watch', 'wifi'
                ]);
                const mappedData = data.map(item => ({
                    id: item.id,
                    name: item.nom,
                    floor: item.etage,
                    location: item.description || item.batiment,
                    icon: allowedIcons.has(item.icon) ? item.icon : 'map-pin',
                    color: item.color,
                    bgColor: item.bgColor,
                    type: item.type
                }));
                setServices(mappedData.filter(i => i.type === 'DEPARTMENT'));
                setEquipments(mappedData.filter(i => i.type === 'EQUIPMENT'));
            }
        } catch (error) {
            console.warn("Failed to load guidance data:", error);
        }
    };

    useEffect(() => {
        loadData();
        loadGuidanceData();
    }, []);

    const savePatient = async (newData) => {
        try {
            setPatient(newData);
            await AsyncStorage.setItem('patient', JSON.stringify(newData));

            const token = await AsyncStorage.getItem('token');
            if (token) {
                const res = await fetch(`${API_URL}/api/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newData)
                });
                if (res.ok) {
                    console.log('[SYNC] Profile saved to backend');
                } else {
                    const errorData = await res.json();
                    console.warn('[SYNC] Failed to save profile to backend:', errorData.error);
                }
            }
        } catch (e) {
            console.warn("Failed to save patient data", e);
        }
    };

    useEffect(() => {
        const checkPermissions = async () => {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.warn('Failed to get push token for push notification!');
                return;
            }
        };
        checkPermissions();
    }, []);

    const triggerLocalNotification = async (title, body) => {
        if (Platform.OS === 'web') {
            console.log(`[Web Notification] ${title}: ${body}`);
            return;
        }
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true,
            },
            trigger: null,
        });
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('patient');
            await AsyncStorage.removeItem('user');
            setPatient({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                birthDate: "",
                bloodGroup: "",
                allergies: [],
                history: [],
                treatingDoctor: "",
                socialSecurity: "",
                emergencyContact: {
                    name: "",
                    phone: "",
                    relation: "",
                    email: ""
                },
                patientSince: "",
            });
            setAppointments([]);
            setNotifications([]);
            setDocuments([]);
            console.log('[AUTH] Logged out and cleared storage');
        } catch (e) {
            console.warn("Failed to clear logout data", e);
        }
    };

    const syncAllData = async (token) => {
        if (!token) return;
        console.log('[SYNC] Starting full data synchronization...');
        try {
            const savedPatientJson = await AsyncStorage.getItem('patient');
            const savedPatient = savedPatientJson ? JSON.parse(savedPatientJson) : {};

            const [profRes, aptRes, docRes, notifRes] = await Promise.all([
                fetch(`${API_URL}/api/patients/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/appointments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/documents`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/patients/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (profRes.ok) {
                const data = await profRes.json();
                const standardizedData = {
                    ...data,
                    firstName: data.firstName || data.prenom || "",
                    lastName: data.lastName || data.nom || "",
                    phone: data.phone || data.telephone || savedPatient.phone || "",
                    patientSince: data.createdAt ? new Date(data.createdAt).getFullYear().toString() : (data.patientSince || "2024"),
                    emergencyContact: {
                        name: data.emergencyContact?.name || savedPatient?.emergencyContact?.name || "",
                        phone: data.emergencyContact?.phone || savedPatient?.emergencyContact?.phone || "",
                        relation: data.emergencyContact?.relation || savedPatient?.emergencyContact?.relation || "",
                        email: data.emergencyContact?.email || savedPatient?.emergencyContact?.email || ""
                    }
                };
                setPatient(standardizedData);
                await AsyncStorage.setItem('patient', JSON.stringify(standardizedData));
            }

            if (aptRes.ok) {
                const data = await aptRes.json();
                setAppointments(data.filter(a => a.status === 'confirme' || a.status === 'en_cours'));
                setHistory(data.filter(a => a.status === 'termine' || a.status === 'annule'));
                setRequests(data.filter(a => a.status === 'en_attente' || a.status === 'reporte' || a.status === 'demande_annulation'));
            }

            if (docRes.ok) {
                const data = await docRes.json();
                const parseDocMeta = (urlFichier) => {
                    try {
                        if (!urlFichier || typeof urlFichier !== 'string') return {};
                        const query = urlFichier.split('?')[1] || '';
                        const params = new URLSearchParams(query);
                        return {
                            issuerName: params.get('issuer') || '',
                            practitionerName: params.get('practitioner') || '',
                            sourceType: params.get('source') || ''
                        };
                    } catch { return {}; }
                };
                const mappedDocs = (Array.isArray(data) ? data : []).map((doc) => ({
                    ...parseDocMeta(doc.urlFichier),
                    id: doc.id,
                    title: doc.title || doc.titre || 'Document',
                    doctor: doc.doctor || doc.praticien || 'notSpecified',
                    date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : ''),
                    size: doc.size || 'N/A',
                    category: doc.category || doc.type || 'autre',
                    subCategory: doc.subCategory || null,
                    createdAt: doc.createdAt || null
                }));
                setDocuments(mappedDocs);
            }

            if (notifRes.ok) {
                const data = await notifRes.json();
                const isRelevantPatientNotification = (notif) => {
                    const text = `${notif?.titre || ''} ${notif?.message || ''}`.toLowerCase();
                    const isDocumentNotif = text.includes('document') || text.includes('dossier');
                    const isAppointmentStatusNotif =
                        (text.includes('rendez-vous') || text.includes('rendez vous')) &&
                        (text.includes('confirm') || text.includes('report') || text.includes('annul') || text.includes('statut') || text.includes('mise à jour') || text.includes('mis à jour') || text.includes('planifié') ||
                            text.includes('début') || text.includes('préparer') || text.includes('recevoir'));
                    const isConsultationDoneNotif = text.includes('consultation') && (text.includes('termin') || text.includes('complète'));
                    return isDocumentNotif || isAppointmentStatusNotif || isConsultationDoneNotif;
                };
                const inferNotificationLink = (notif) => {
                    const text = `${notif?.titre || ''} ${notif?.message || ''}`.toLowerCase();
                    if (text.includes('rendez-vous') || text.includes('rendez vous')) return '/appointments';
                    if (text.includes('document') || text.includes('dossier')) return '/documents';
                    if (text.includes('urgence')) return '/urgence';
                    return '/dashboard';
                };
                const mappedNotifs = data
                    .filter(isRelevantPatientNotification)
                    .map(n => ({
                        id: n.id,
                        text: n.message,
                        title: n.titre,
                        time: "justNow",
                        icon: "🔔",
                        isNew: !n.lue,
                        createdAt: n.createdAt,
                        fromBackend: true,
                        link: inferNotificationLink(n)
                    }));
                setNotifications(mappedNotifs);
            }

            console.log('[SYNC] Synchronization complete.');
        } catch (error) {
            console.error('[SYNC] Error syncing data:', error);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                await syncAllData(token);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const REFRESH_MS = 5000;
        let intervalId;

        const refreshIfAuthenticated = async () => {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                await syncAllData(token);
            }
        };

        intervalId = setInterval(refreshIfAuthenticated, REFRESH_MS);

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.addEventListener('focus', refreshIfAuthenticated);
            document.addEventListener('visibilitychange', refreshIfAuthenticated);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.removeEventListener('focus', refreshIfAuthenticated);
                document.removeEventListener('visibilitychange', refreshIfAuthenticated);
            }
        };
    }, []);

    useEffect(() => {
        const pushNewBackendNotifications = async () => {
            const backendUnseen = notifications.filter(
                (n) => n.fromBackend && n.isNew && !notifiedBackendIdsRef.current.has(String(n.id))
            );
            for (const notif of backendUnseen) {
                notifiedBackendIdsRef.current.add(String(notif.id));
                await triggerLocalNotification(notif.title || 'Nouvelle notification', notif.text || '');
            }
        };
        pushNewBackendNotifications();
    }, [notifications]);

    return (
        <AppContext.Provider value={{
            patient, setPatient: savePatient,
            appointments, setAppointments,
            history, setHistory,
            notifications, setNotifications,
            documents, setDocuments,
            requests, setRequests,
            services,
            equipments,
            syncAllData,
            logout,
            API_URL
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export const useData = useApp;
