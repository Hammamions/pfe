import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { inferOrdonnanceSubCategory, normalizeOrdonnanceContenu } from './ordonnanceUtils';
import { getApiBaseUrl } from './utils/apiBase';
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

function mapPatientNotificationsFromApi(data) {
    const inferNotificationLink = (notif) => {
        const text = `${notif?.titre || ''} ${notif?.message || ''}`.toLowerCase();
        if (text.includes('rendez-vous') || text.includes('rendez vous')) return '/appointments';
        if (text.includes('document') || text.includes('dossier') || text.includes('ordonnance')) return '/documents';
        if (text.includes('urgence')) return '/urgence';
        return '/dashboard';
    };
    const sanitizeNotificationMessage = (msg) =>
        String(msg || '')
            .replace(/\s*\[\[RDV_[^\]]+\]\]\s*/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

    return (Array.isArray(data) ? data : []).map((n) => {
        const rawMessage = String(n.message || '');
        const preVisitMatch = rawMessage.match(/\[\[RDV_PRE(?:15|30):(\d+)]]/);
        const normalizedText = preVisitMatch
            ? 'Veuillez confirmer votre présence à ce rendez-vous.'
            : sanitizeNotificationMessage(n.message);
        return {
            rawMessage,
            id: n.id,
            text: normalizedText,
            title: n.titre,
            time: 'justNow',
            icon: '🔔',
            isNew: !n.lue,
            createdAt: n.createdAt,
            fromBackend: true,
            link: inferNotificationLink(n),
            preVisitAppointmentId: preVisitMatch ? Number(preVisitMatch[1]) : null,
        };
    });
}

export const AppProvider = ({ children }) => {
    const notifiedBackendIdsRef = useRef(new Set());
    const recentlyDeletedNotifIdsRef = useRef(new Set());

    const stripPendingDeletedNotifications = (mapped) => {
        const blocked = recentlyDeletedNotifIdsRef.current;
        if (!blocked.size) return mapped;
        return (mapped || []).filter((n) => n?.id == null || !blocked.has(String(n.id)));
    };

    const registerNotificationDeleted = (id) => {
        if (id == null || id === '') return;
        const key = String(id);
        recentlyDeletedNotifIdsRef.current.add(key);
        setTimeout(() => {
            recentlyDeletedNotifIdsRef.current.delete(key);
        }, 15000);
    };
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

    const API_URL = getApiBaseUrl();
    const syncMutexRef = useRef(Promise.resolve());

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
            const guiRes = await fetch(`${getApiBaseUrl()}/api/guidance`);
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
                const res = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
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
            notifiedBackendIdsRef.current.clear();
            recentlyDeletedNotifIdsRef.current.clear();
            syncMutexRef.current = Promise.resolve();
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
            setRequests([]);
            setHistory([]);
            setNotifications([]);
            setDocuments([]);
            console.log('[AUTH] Logged out and cleared storage');
        } catch (e) {
            console.warn("Failed to clear logout data", e);
        }
    };

    const refreshNotifications = async (token) => {
        if (!token) return;
        const prev = syncMutexRef.current;
        const run = async () => {
            await prev.catch(() => { });
            try {
                const base = getApiBaseUrl();
                const notifRes = await fetch(`${base}/api/patients/notifications?_=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                    },
                });
                if (notifRes.ok) {
                    const activeToken = await AsyncStorage.getItem('token');
                    if (!activeToken || activeToken !== token) return;
                    const data = await notifRes.json();
                    setNotifications(stripPendingDeletedNotifications(mapPatientNotificationsFromApi(data)));
                }
            } catch (e) {
                console.warn('[SYNC] refreshNotifications failed', e);
            }
        };
        const p = run();
        syncMutexRef.current = p;
        return p;
    };

    const syncAllData = async (token) => {
        if (!token) return;
        const prev = syncMutexRef.current;
        const run = async () => {
            await prev.catch(() => { });
            console.log('[SYNC] Starting full data synchronization...');
            try {
                const base = getApiBaseUrl();
                const savedPatientJson = await AsyncStorage.getItem('patient');
                const savedPatient = savedPatientJson ? JSON.parse(savedPatientJson) : {};

                const docUrl = `${base}/api/documents?_=${Date.now()}`;
                const SYNC_FETCH_MS = 25000;
                const withTimeout = (promise, label) => {
                    let timer;
                    return Promise.race([
                        promise.finally(() => {
                            if (timer) clearTimeout(timer);
                        }),
                        new Promise((_, reject) => {
                            timer = setTimeout(() => reject(new Error(`sync timeout: ${label}`)), SYNC_FETCH_MS);
                        })
                    ]);
                };
                const syncLabels = ['profile', 'appointments', 'documents', 'notifications'];
                const settled = await Promise.allSettled([
                    withTimeout(
                        fetch(`${base}/api/patients/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                        'profile'
                    ),
                    withTimeout(
                        fetch(`${base}/api/appointments?_=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                        'appointments'
                    ),
                    withTimeout(
                        fetch(docUrl, {
                            cache: 'no-store',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }),
                        'documents'
                    ),
                    withTimeout(
                        fetch(`${base}/api/patients/notifications?_=${Date.now()}`, {
                            cache: 'no-store',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Cache-Control': 'no-cache',
                                Pragma: 'no-cache',
                            },
                        }),
                        'notifications'
                    )
                ]);
                settled.forEach((out, i) => {
                    if (out.status === 'rejected') {
                        console.warn(`[SYNC] ${syncLabels[i]} failed`, out.reason);
                    }
                });

                const profRes = settled[0].status === 'fulfilled' ? settled[0].value : null;
                const aptRes = settled[1].status === 'fulfilled' ? settled[1].value : null;
                const docRes = settled[2].status === 'fulfilled' ? settled[2].value : null;
                const notifRes = settled[3].status === 'fulfilled' ? settled[3].value : null;

                const activeToken = await AsyncStorage.getItem('token');
                if (!activeToken || activeToken !== token) {
                    console.log('[SYNC] Apply skipped (déconnexion ou session remplacée)');
                    return;
                }

                if (profRes?.ok) {
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

                if (aptRes?.ok) {
                    const data = await aptRes.json();
                    setAppointments(data.filter(a => a.status === 'confirme' || a.status === 'en_cours'));
                    setHistory(data.filter(a => a.status === 'termine' || a.status === 'annule'));
                    setRequests(data.filter(a => a.status === 'en_attente' || a.status === 'reporte' || a.status === 'demande_annulation'));
                }

                if (docRes?.ok) {
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
                    const normalizeDocId = (doc) => {
                        const rawStr = String(doc.id ?? '').trim();
                        if (/^ord_\d+$/i.test(rawStr)) {
                            const m = /^ord_(\d+)$/i.exec(rawStr);
                            return `ord_${m[1]}`;
                        }
                        const isOrd =
                            Boolean(doc.isOrdonnance) ||
                            String(doc.type || doc.category || '').toLowerCase() === 'ordonnance';
                        if (isOrd) {
                            const n = parseInt(rawStr, 10);
                            if (!Number.isNaN(n)) return `ord_${n}`;
                        }
                        return doc.id;
                    };
                    const mappedDocs = (Array.isArray(data) ? data : []).map((doc) => {
                        const rawContenu = doc.ordonnanceContenu ?? doc.ordonnance_contenu ?? doc.contenu;
                        const idStr = doc.id != null ? String(doc.id).trim() : '';
                        const isOrdRow =
                            Boolean(doc.isOrdonnance) ||
                            String(doc.type || doc.category || '').toLowerCase() === 'ordonnance' ||
                            /^ord_\d+$/i.test(idStr);
                        return {
                            ...parseDocMeta(doc.urlFichier),
                            id: normalizeDocId(doc),
                            title: doc.title || doc.titre || 'Document',
                            doctor: doc.doctor || doc.praticien || 'notSpecified',
                            date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : ''),
                            size: doc.size || 'N/A',
                            category: doc.category || doc.type || 'autre',
                            createdAt: doc.createdAt || null,
                            ordonnanceContenu: normalizeOrdonnanceContenu(rawContenu),
                            isOrdonnance: isOrdRow,
                            subCategory: doc.subCategory || (isOrdRow ? inferOrdonnanceSubCategory(rawContenu) : null),
                            urlFichier: doc.urlFichier || null,
                            publicId: doc.publicId || null,
                            contentSha256: doc.contentSha256 || null,
                            isSecureDocument: Boolean(doc.isSecureDocument || doc.publicId),
                            securePreviewSummary: doc.securePreviewSummary || null,
                            anchorTxHash: doc.anchorTxHash || null,
                            medecinSpecialite: doc.medecinSpecialite ?? null,
                            medecinNumeroOrdre: doc.medecinNumeroOrdre ?? null
                        };
                    });
                    setDocuments(mappedDocs);
                }

                if (notifRes?.ok) {
                    const data = await notifRes.json();
                    setNotifications(stripPendingDeletedNotifications(mapPatientNotificationsFromApi(data)));
                }

                console.log('[SYNC] Synchronization complete.');
            } catch (error) {
                console.error('[SYNC] Error syncing data:', error);
            }
        };
        const p = run();
        syncMutexRef.current = p;
        return p;
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
            refreshNotifications,
            registerNotificationDeleted,
            logout,
            API_URL
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export const useData = useApp;
