import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { sha256 } from 'js-sha256';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Dimensions,
    I18nManager,
    Image,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { patientPastel, screenPastelGradient, theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';
import SwipeDeleteRow from './components/SwipeDeleteRow';
import { getOrdonnanceMedicationsAndNotes, inferOrdonnanceSubCategory, normalizeOrdonnanceContenu } from './ordonnanceUtils';
import AsyncStorage from './utils/storage';

const { width } = Dimensions.get('window');

function resolveDeletePathId(doc) {
    if (!doc) return '';
    const rawStr = String(doc.id ?? '').trim();
    if (/^ord_\d+$/i.test(rawStr)) {
        const m = /^ord_(\d+)$/i.exec(rawStr);
        return `ord_${m[1]}`;
    }
    const isOrd =
        Boolean(doc.isOrdonnance) ||
        String(doc.category || doc.type || '').toLowerCase() === 'ordonnance' ||
        (doc.ordonnanceContenu != null && String(doc.ordonnanceContenu).trim() !== '');
    if (isOrd) {
        const n = parseInt(rawStr, 10);
        if (!Number.isNaN(n)) return `ord_${n}`;
    }
    return rawStr;
}

const RADIOLOGY_TYPES = new Set(['echographie', 'irm', 'scanner', 'radiographie']);
const ANALYSIS_TYPES = new Set(['sang', 'urine', 'selles', 'ponction']);
const RAPPORT_TYPES = new Set(['cr_operatoire', 'lettre_sortie', 'bilan_annuel']);
const AUTRE_TYPES = new Set(['certificat', 'facture', 'assurance']);

function isOrdonnanceDoc(doc) {
    const c = String(doc?.category || doc?.type || '').toLowerCase();
    return (
        Boolean(doc?.isOrdonnance) ||
        c === 'ordonnance' ||
        (typeof doc?.id === 'string' && /^ord_\d+$/i.test(doc.id.trim()))
    );
}

function getParentCategoryForFilter(doc) {
    const c = String(doc?.category || doc?.type || 'autre').toLowerCase();
    if (c === 'secure_medical') return 'rapport';
    if (c === 'biologie') return 'analyse';
    if (RADIOLOGY_TYPES.has(c)) return 'radiologie';
    if (ANALYSIS_TYPES.has(c)) return 'analyse';
    if (isOrdonnanceDoc(doc)) return 'ordonnance';
    if (RAPPORT_TYPES.has(c)) return 'rapport';
    if (AUTRE_TYPES.has(c)) return 'autre';
    return c;
}

function getSubCategoryForFilter(doc) {
    const c = String(doc?.category || doc?.type || '').toLowerCase();
    if (isOrdonnanceDoc(doc)) {
        return inferOrdonnanceSubCategory(doc?.ordonnanceContenu);
    }
    const knownSub = new Set([
        ...RADIOLOGY_TYPES,
        ...ANALYSIS_TYPES,
        'medicamenteuse',
        'soins_infirmiers',
        'kinesitherapie',
        ...RAPPORT_TYPES,
        ...AUTRE_TYPES
    ]);
    if (knownSub.has(c)) return c;
    return null;
}

const DOCUMENT_FILTER_CATEGORIES = [
    { id: 'Tous', label: 'allTypes' },
    { id: 'radiologie', label: 'radiologie' },
    { id: 'analyse', label: 'analyse' },
    { id: 'ordonnance', label: 'ordonnance' },
    { id: 'rapport', label: 'rapport' }
];

const DOCUMENT_FILTER_SUBCATEGORIES = {
    radiologie: [
        { id: 'Tous', label: 'allTypes' },
        { id: 'echographie', label: 'echographie' },
        { id: 'irm', label: 'irm' },
        { id: 'scanner', label: 'scanner' },
        { id: 'radiographie', label: 'radiographie' }
    ],
    analyse: [
        { id: 'Tous', label: 'allTypes' },
        { id: 'sang', label: 'sang' },
        { id: 'urine', label: 'urine' },
        { id: 'selles', label: 'selles' },
        { id: 'ponction', label: 'ponction' }
    ],
    ordonnance: [
        { id: 'Tous', label: 'allTypes' },
        { id: 'medicamenteuse', label: 'medicamenteuse' },
        { id: 'soins_infirmiers', label: 'soins_infirmiers' },
        { id: 'kinesitherapie', label: 'kinesitherapie' }
    ],
    rapport: [
        { id: 'Tous', label: 'allTypes' },
        { id: 'cr_operatoire', label: 'cr_operatoire' },
        { id: 'lettre_sortie', label: 'lettre_sortie' },
        { id: 'bilan_annuel', label: 'bilan_annuel' }
    ]
};

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function ordonnanceHtmlFromContenu(contenu) {
    const normalized = normalizeOrdonnanceContenu(contenu);
    if (!normalized) return '<p style="color:#64748b">—</p>';
    const { items, notes, plain } = getOrdonnanceMedicationsAndNotes(normalized);
    if (items && items.length > 0) {
        return items.map((m, i) => {
            const nom = escapeHtml(m.nom || '');
            const dosage = escapeHtml(m.dosage || '');
            const freq = escapeHtml(m.frequence || '');
            const duree = escapeHtml(m.duree || '');
            const instr = m.instructions ? escapeHtml(m.instructions) : '';
            return `<li style="margin-bottom:15px;"><strong>${i + 1}. ${nom} ${dosage}</strong><br/>${freq}${freq && duree ? ' · ' : ''}${duree}${instr ? `<br/><em>${instr}</em>` : ''}</li>`;
        }).join('');
    }
    if (notes) {
        return `<p style="white-space:pre-wrap">${escapeHtml(notes)}</p>`;
    }
    return `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(plain || '')}</pre>`;
}

function stripDrPrefix(name) {
    return String(name || '')
        .replace(/^\s*dr\.?\s+/i, '')
        .trim();
}

function formatSlashDate(raw) {
    if (raw == null || raw === '') return '—';
    const d = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }
    const s = String(raw).trim();
    return s || '—';
}


function OrdonnancePatientCard({ doc, patient, t, isRTL }) {
    const p = patient || {};
    const issuer = (doc?.issuerName || doc?.doctor || doc?.praticien || '').trim();
    const doctorLine = stripDrPrefix(issuer) || t('notSpecified');
    const specialty = (doc?.medecinSpecialite || '').trim() || '—';
    const orderNo = (doc?.medecinNumeroOrdre || '').trim() || '—';
    const fn = (p.firstName || p.prenom || '').trim();
    const ln = (p.lastName || p.nom || '').trim();
    const patientName = `${fn} ${ln}`.trim() || '—';
    const birthRaw = p.birthDate || p.dateNaissance || '';
    const birthDisplay = birthRaw ? formatSlashDate(birthRaw) : '—';
    const ssn = (p.socialSecurity || p.numSecuriteSociale || '').trim() || '—';
    const issueSlash = formatSlashDate(doc?.createdAt || doc?.date || null);
    const { items, notes, plain } = getOrdonnanceMedicationsAndNotes(doc?.ordonnanceContenu);
    const textAlign = isRTL ? 'right' : 'left';
    const rowDir = isRTL ? 'row-reverse' : 'row';
    const contenuNorm = normalizeOrdonnanceContenu(doc?.ordonnanceContenu);
    const ordFingerprint = sha256(String(contenuNorm || ''));

    return (
        <View style={styles.prescriptionCard}>
            <Text style={[styles.prescriptionTitleCaps, { textAlign }]}>{t('prescriptionCardTitle')}</Text>
            <Text style={[styles.prescriptionDoctorName, { textAlign }]}>{doctorLine}</Text>
            <Text style={[styles.prescriptionMutedLine, { textAlign }]}>{specialty}</Text>
            <Text style={[styles.prescriptionMutedLine, { textAlign }]}>
                {t('prescriptionOrderLabel')} {orderNo}
            </Text>
            <View style={styles.prescriptionHr} />
            <Text style={[styles.prescriptionPatientLine, { textAlign }]}>
                <Text style={styles.prescriptionBold}>{t('prescriptionPatientLabel')} </Text>
                {patientName}
            </Text>
            <Text style={[styles.prescriptionMutedLine, { textAlign, marginTop: 6 }]}>
                {t('prescriptionBornLabel')} {birthDisplay}
            </Text>
            <Text style={[styles.prescriptionMutedLine, { textAlign, marginTop: 4 }]}>
                {t('prescriptionSsnLabel')} {ssn}
            </Text>
            <View style={[styles.prescriptionDateRow, { flexDirection: rowDir }]}>
                <Feather name="calendar" size={16} color="#64748b" />
                <Text style={[styles.prescriptionDateText, isRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>
                    {t('prescriptionDateOn')} {issueSlash}
                </Text>
            </View>
            <View style={{ marginTop: 18 }}>
                {items && items.length > 0 ? (
                    items.map((m, i) => (
                        <View key={i} style={{ marginBottom: 16 }}>
                            <Text style={[styles.prescriptionMedTitle, { textAlign }]}>
                                {i + 1}. {m.nom}
                                {m.dosage ? ` ${m.dosage}` : ''}
                            </Text>
                            <Text style={[styles.prescriptionMedBody, { textAlign }]}>
                                {[m.frequence, m.duree].filter(Boolean).join(' ')}
                            </Text>
                            {m.instructions ? (
                                <Text style={[styles.prescriptionMedNote, { textAlign }]}>*{m.instructions}*</Text>
                            ) : null}
                        </View>
                    ))
                ) : notes ? (
                    <Text style={[styles.prescriptionMedBody, { textAlign, fontStyle: 'italic' }]}>{notes}</Text>
                ) : plain ? (
                    <Text style={[styles.prescriptionMedBody, { textAlign }]}>{plain}</Text>
                ) : (
                    <Text style={[styles.prescriptionMutedLine, { textAlign }]}>—</Text>
                )}
                {items && items.length > 0 && notes ? (
                    <Text style={[styles.prescriptionMedNote, { textAlign, marginTop: 4 }]}>{notes}</Text>
                ) : null}
            </View>
            <View style={styles.prescriptionHr} />
            <View style={{ marginTop: 8, alignSelf: isRTL ? 'flex-start' : 'flex-end' }}>
                <View style={styles.prescriptionQrWrap}>
                    <QRCode value={ordFingerprint} size={76} color="#0f172a" backgroundColor="#ffffff" />
                </View>
            </View>
        </View>
    );
}

const Documents = () => {
    const { t, i18n } = useTranslation();
    const { documents, setDocuments, syncAllData, API_URL, patient } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('Tous');
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [subCategoryMenuOpen, setSubCategoryMenuOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [filterSubType, setFilterSubType] = useState('Tous');
    const isRTL = i18n.language === 'ar';

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    if (token && !cancelled) await syncAllData(token);
                } catch (e) {
                    console.warn('[documents] sync on focus', e);
                }
            })();
            return () => {
                cancelled = true;
            };
        }, [syncAllData])
    );

    useEffect(() => {
        if (filterType === 'autre') {
            setFilterType('Tous');
            setFilterSubType('Tous');
        }
    }, [filterType]);

    const getPractitionerName = (doc) => {
        const byMeta = (doc?.practitionerName || '').trim();
        const byDoctor = (doc?.doctor || '').trim();
        if (byMeta) return byMeta;
        if (!byDoctor || byDoctor === 'notSpecified') return '';
        return byDoctor;
    };
    const getIssuerName = (doc) => {
        const byMeta = (doc?.issuerName || '').trim();
        if (byMeta) return byMeta;
        return getPractitionerName(doc);
    };

    const filteredDocs = documents.filter((doc) => {
        const title = String(doc?.title || doc?.titre || '').toLowerCase();
        const doctor = String(doc?.doctor || doc?.praticien || '').toLowerCase();
        const term = String(searchTerm || '').toLowerCase();
        const matchesSearch =
            title.includes(term) ||
            doctor.includes(term);
        const parentCat = getParentCategoryForFilter(doc);
        const matchesFilter = filterType === 'Tous' || parentCat === filterType;
        const subCat = getSubCategoryForFilter(doc);
        const matchesSubFilter =
            filterSubType === 'Tous' ||
            (subCat != null && subCat === filterSubType);
        return matchesSearch && matchesFilter && matchesSubFilter;
    });


    const now = new Date();
    const threshold = new Date();
    threshold.setMonth(now.getMonth() - 2);

    const getDocumentSortTime = (d) => {
        const t = new Date(d.createdAt || d.date).getTime();
        return Number.isNaN(t) ? Date.now() : t;
    };

    const recentDocs = filteredDocs.filter((d) => getDocumentSortTime(d) >= threshold.getTime());
    const historyDocs = filteredDocs.filter((d) => getDocumentSortTime(d) < threshold.getTime());

    const getDocIconAndColors = (category) => {
        switch (category) {
            case 'radiologie':
                return { icon: 'image', bg: '#f3e8ff', text: '#7c3aed' };
            case 'biologie':
            case 'analyse':
                return { icon: 'file-text', bg: '#eff6ff', text: '#3b82f6' };
            case 'ordonnance':
                return { icon: 'file-text', bg: '#eef2ff', text: '#4f46e5' };
            case 'rapport':
            case 'secure_medical':
                return { icon: 'file-text', bg: '#ffedd5', text: '#f97316' };
            default:
                return { icon: 'file', bg: '#f1f5f9', text: '#64748b' };
        }
    };

    const executeDeleteDocument = async (doc) => {
        if (!doc) return;
        const removedKey = resolveDeletePathId(doc);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert(t('error'), t('sessionExpired') || 'Session expirée');
                return;
            }
            const res = await fetch(`${API_URL}/api/documents/remove`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: removedKey })
            });
            let body = {};
            try {
                body = await res.json();
            } catch {
            }
            if (res.status === 403) {
                const message = body?.error || t('deleteFailed') || 'Suppression impossible';
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.alert(`${t('error')}: ${message}`);
                } else {
                    Alert.alert(t('error'), message);
                }
                return;
            }
            if (!res.ok && res.status !== 404) {
                let message = t('deleteFailed') || 'Suppression impossible';
                if (body?.error) message = body.error;
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.alert(`${t('error')}: ${message}`);
                } else {
                    Alert.alert(t('error'), message);
                }
                return;
            }

            setSelectedDoc((cur) => (cur && resolveDeletePathId(cur) === removedKey ? null : cur));
            setDocuments((prev) => prev.filter((d) => resolveDeletePathId(d) !== removedKey));
        } catch (e) {
            console.error('[documents] delete', e);
            const msg = t('deleteFailed') || 'Suppression impossible';
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.alert(`${t('error')}: ${msg}`);
            } else {
                Alert.alert(t('error'), msg);
            }
        }
    };

    const deleteDocument = (doc) => {
        if (!doc) return;
        const title = t('deleteQuestion');
        const message = t('deleteConfirmDocument');
        const run = () => void executeDeleteDocument(doc);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.confirm(`${title}\n\n${message}`)) run();
            return;
        }
        Alert.alert(title, message, [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: run }
        ]);
    };

    const handleDownload = async (doc) => {
        try {
            if (doc.isSecureDocument && doc.publicId) {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    const msg = t('sessionExpired');
                    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
                    else Alert.alert(t('error'), msg);
                    return;
                }
                const base = String(API_URL || '').replace(/\/$/, '');
                const dl = `${base}/api/secure-documents/download/${encodeURIComponent(String(doc.publicId))}`;
                const safeName = `${String(t(doc.title) || 'document').replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
                if (Platform.OS === 'web') {
                    const res = await fetch(dl, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) {
                        const errBody = await res.text().catch(() => '');
                        throw new Error(errBody || res.statusText || String(res.status));
                    }
                    const blob = await res.blob();
                    const href = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = href;
                    a.download = safeName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(href), 60_000);
                } else {
                    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
                    if (!dir) throw new Error('cacheDirectory unavailable');
                    const target = `${dir}secure-${doc.publicId}.pdf`;
                    const result = await FileSystem.downloadAsync(dl, target, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
                    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri);
                    else Alert.alert(t('error'), t('sharingUnavailable') || 'Partage indisponible');
                }
                return;
            }

            let bodyInner = '';
            if (doc.category === 'biologie' || doc.category === 'analyse') {
                bodyInner = `
 <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <tr style="background-color: #f1f5f9;"><th style="padding: 10px; border: 1px solid #e2e8f0;">Examen</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Résultat</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Valeur de référence</th></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Hémoglobine</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">14.2 g/dL</td><td style="padding: 10px; border: 1px solid #e2e8f0;">13.0 - 17.0</td></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Glycémie à jeun</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #ef4444;">1.15 g/L</td><td style="padding: 10px; border: 1px solid #e2e8f0;">0.70 - 1.10</td></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Cholestérol Total</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">1.85 g/L</td><td style="padding: 10px; border: 1px solid #e2e8f0;">&lt; 2.00</td></tr>
                            </table>
                            <p style="margin-top: 20px; color: #64748b;"><em>Conclusion: Glycémie légèrement élevée. À surveiller.</em></p>`;
            } else if (doc.category === 'radiologie') {
                bodyInner = `
                            <div style="text-align: center; background-color: #000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                                <img src="https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=600&auto=format&fit=crop" style="max-height: 250px; border-radius: 8px; filter: grayscale(100%); mix-blend-mode: screen;" alt="Radiographie" />
                            </div>
                            <p style="margin-top: 20px; line-height: 1.8;"><strong>Compte rendu du radiologue :</strong><br/>Radiographie thoracique de face.<br/>La trame pulmonaire est d'épaisseur normale. Aucun foyer alvéolaire suspect ni épanchement pleural. La vascularisation est respectée.<br/><strong>Conclusion :</strong> Cliché normal sans signe évolutif.</p>`;
            } else if (doc.category === 'ordonnance') {
                if (normalizeOrdonnanceContenu(doc.ordonnanceContenu)) {
                    const inner = ordonnanceHtmlFromContenu(doc.ordonnanceContenu);
                    bodyInner = inner.startsWith('<pre')
                        ? inner
                        : '<ul style="list-style-type: none; padding: 0;">' + inner + '</ul>';
                } else {
                    bodyInner =
                        '<p style="color:#64748b">Le détail de cette ordonnance n\'est pas disponible. Rouvrez l\'application après synchronisation ou contactez le service si le problème persiste.</p>';
                }
            } else {
                bodyInner = `<p>Le patient s'est présenté ce jour pour un suivi régulier. L'état général est bon, pas de signes cliniques d'infection. Pression artérielle à 120/80 mmHg. Le traitement actuel est bien toléré et doit être poursuivi sans modification.</p>`;
            }

            const htmlContent = `
                <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <div style="border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; text-align: ${isRTL ? 'right' : 'left'};">
                        <h1 style="color: #3730a3; margin: 0;">TuniSanté</h1>
                        <p style="color: #64748b; margin: 5px 0 0 0;">REF: DOC-${doc.id}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <h2 style="font-size: 24px; color: #000; margin-bottom: 5px;">${t(doc.title)}</h2>
                        <p style="color: #64748b; font-size: 16px;">${t('issuedBy')} ${getIssuerName(doc) || t('notSpecified')}</p>
                    </div>

                    <div style="background-color: #f5f3ff; padding: 20px; border-radius: 10px; margin-bottom: 40px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            ${getPractitionerName(doc) ? `
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; width: 40%; border-bottom: 1px solid #e2e8f0;">${t('practitioner')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${getPractitionerName(doc)}</td>
                            </tr>` : ''}
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t('date')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${doc.date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">${t('category')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'};">${t(doc.category)} ${doc.subCategory ? '(' + t(doc.subCategory) + ')' : ''}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-bottom: 40px; line-height: 1.6;">
                        <h3 style="color: #3730a3; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">Contenu du document</h3>
                        ${bodyInner}
                    </div>

                </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                try {
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = document.createElement('div');
                    element.innerHTML = htmlContent;
                    const opt = {
                        margin: 0.5,
                        filename: `${t(doc.title) || 'Document'}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(element).save();
                } catch (e) {
                    console.error("html2pdf error:", e);
                    alert("Error creating PDF on web.");
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html: htmlContent });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    alert('Sharing is not available on your device');
                }
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error downloading document");
        }
    };

    const renderDocCard = (doc) => {
        const styling = getDocIconAndColors(doc.category);
        const isSecure = Boolean(doc.isSecureDocument);

        const cardBody = (
            <Pressable
                style={({ pressed }) => [
                    styles.docCardModern,
                    pressed && styles.docCardPressed,
                    isSecure && styles.docCardSecure
                ]}
                onPress={() => setSelectedDoc(doc)}
            >
                <View style={[styles.docHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={[styles.iconBoxModern, { backgroundColor: styling.bg }]}>
                        <Feather name={styling.icon} size={22} color={styling.text} />
                    </View>
                    <View
                        style={[
                            styles.docHeaderMeta,
                            { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 },
                            isRTL ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }
                        ]}
                    >
                        <View style={[styles.categoryPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.categoryPillText}>{t(doc.category)}</Text>
                            {doc.subCategory ? (
                                <Text style={styles.categoryPillSub}>· {t(doc.subCategory)}</Text>
                            ) : null}
                        </View>
                        {isSecure ? (
                            <View style={[styles.secureChip, isRTL && { alignSelf: 'flex-start' }]}>
                                <Feather name="shield" size={12} color="#4f46e5" />
                                <Text style={styles.secureChipText}>
                                    {doc.anchorTxHash ? t('docBadgeAnchored') : t('docBadgeEncrypted')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <Text style={[styles.docTitleModern, isRTL && { textAlign: 'right' }]} numberOfLines={2}>
                    {t(doc.title)}
                </Text>
                <Text style={[styles.docDoctorModern, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                    {getIssuerName(doc) ? `${t('issuedBy')} ${getIssuerName(doc)}` : t('issuedBy')}
                </Text>

                <View style={[styles.docMetaRowModern, isRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.metaChip}>
                        <Feather name="calendar" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.metaChipText}>{doc.date}</Text>
                    </View>
                </View>

                <View style={[styles.docActionsModern, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => setSelectedDoc(doc)} activeOpacity={0.9}>
                        <Feather name="eye" size={17} color="#fff" />
                        <Text style={styles.actionBtnPrimaryText}>{t('view')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnGhost} onPress={() => handleDownload(doc)} activeOpacity={0.85}>
                        <Feather name="download" size={17} color={theme.colors.primary} />
                        <Text style={styles.actionBtnGhostText}>{t('download')}</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        );

        return (
            <SwipeDeleteRow
                key={String(doc.id)}
                rowKey={String(doc.id)}
                cornerRadius={22}
                accessibilityLabel={t('delete')}
                onDelete={() => deleteDocument(doc)}
            >
                {cardBody}
            </SwipeDeleteRow>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="documents" />

            <LinearGradient
                colors={screenPastelGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.mainHeaderGradient, isRTL && { flexDirection: 'row-reverse' }]}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerMainTitle, isRTL && { textAlign: 'right' }]}>{t('myDocuments')}</Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('documentsDesc')}</Text>
                </View>
            </LinearGradient>

            <View style={[styles.searchFilterCard, { zIndex: 10 }]}>
                <View style={[styles.searchBoxInput, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TextInput
                        style={[styles.searchInputText, isRTL && { textAlign: 'right' }, { outlineStyle: 'none' }]}
                        placeholder={t('searchDocument')}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                <View style={[isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }, { gap: 10, zIndex: 20 }]}>
                    <View style={{ flex: 1, position: 'relative' }}>
                        <TouchableOpacity
                            style={[styles.filterMockDropdown, isRTL && { flexDirection: 'row-reverse' }]}
                            onPress={() => {
                                setSubCategoryMenuOpen(false);
                                setCategoryMenuOpen((o) => !o);
                            }}
                        >
                            <Text style={[styles.filterMockText, isRTL && { textAlign: 'right', marginLeft: 10, marginRight: 0 }]} numberOfLines={1}>
                                {t(DOCUMENT_FILTER_CATEGORIES.find(c => c.id === filterType)?.label) || t('allTypes')}
                            </Text>
                            <Feather name="chevron-down" size={16} color="#94a3b8" />
                        </TouchableOpacity>

                        {categoryMenuOpen && (
                            <View style={styles.dropdownMenu}>
                                {DOCUMENT_FILTER_CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.dropdownMenuItem, isRTL && { flexDirection: 'row-reverse' }]}
                                        onPress={() => {
                                            setFilterType(cat.id);
                                            setFilterSubType('Tous');
                                            setCategoryMenuOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownMenuItemText, filterType === cat.id && styles.dropdownMenuItemTextActive, isRTL && { textAlign: 'right' }]}>
                                            {t(cat.label)}
                                        </Text>
                                        {filterType === cat.id && (
                                            <Feather name="check" size={16} color="#64748b" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {DOCUMENT_FILTER_SUBCATEGORIES[filterType] && (
                        <View style={{ flex: 1, position: 'relative' }}>
                            <TouchableOpacity
                                style={[styles.filterMockDropdown, { borderColor: theme.colors.primary }, isRTL && { flexDirection: 'row-reverse' }]}
                                onPress={() => {
                                    setCategoryMenuOpen(false);
                                    setSubCategoryMenuOpen((o) => !o);
                                }}
                            >
                                <Text style={[styles.filterMockText, { color: theme.colors.primary }, isRTL && { textAlign: 'right', marginLeft: 10, marginRight: 0 }]} numberOfLines={1}>
                                    {t(DOCUMENT_FILTER_SUBCATEGORIES[filterType].find(s => s.id === filterSubType)?.label) || t('allTypes')}
                                </Text>
                                <Feather name="chevron-down" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>

                            {subCategoryMenuOpen && (
                                <View style={styles.dropdownMenu}>
                                    {DOCUMENT_FILTER_SUBCATEGORIES[filterType].map((sub) => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={[styles.dropdownMenuItem, isRTL && { flexDirection: 'row-reverse' }]}
                                            onPress={() => {
                                                setFilterSubType(sub.id);
                                                setSubCategoryMenuOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.dropdownMenuItemText, filterSubType === sub.id && { color: theme.colors.primary, fontWeight: '700' }, isRTL && { textAlign: 'right' }]}>
                                                {t(sub.label)}
                                            </Text>
                                            {filterSubType === sub.id && (
                                                <Feather name="check" size={16} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {recentDocs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={[styles.sectionHeaderNew, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="clock" size={18} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitleNew, isRTL && { marginRight: 10, marginLeft: 0 }]}>{t('recentDocuments')}</Text>
                        </View>
                        <Text style={[styles.sectionDescNew, isRTL && { textAlign: 'right' }]}>{t('lastTwoMonths')}</Text>
                        <View style={styles.docCardsStack}>{recentDocs.map(renderDocCard)}</View>
                    </View>
                )}

                {historyDocs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={[styles.sectionHeaderNew, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="archive" size={18} color="#64748b" />
                            <Text style={[styles.sectionTitleNew, { color: '#64748b' }, isRTL && { marginRight: 10, marginLeft: 0 }]}>{t('pastDocuments')}</Text>
                        </View>
                        <View style={styles.dividerThin} />
                        <View style={styles.docCardsStack}>{historyDocs.map(renderDocCard)}</View>
                    </View>
                )}

                {filteredDocs.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Feather name="folder" size={40} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.emptyText}>{t('noDocumentFound')}</Text>
                    </View>
                )}
            </ScrollView>

            <Modal transparent visible={!!selectedDoc} animationType="slide" onRequestClose={() => setSelectedDoc(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { justifyContent: 'flex-end', borderBottomWidth: 0 }]}>
                            <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.closeBtnBox}>
                                <Text style={styles.closeBtn}>×</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedDoc && (
                            <ScrollView style={styles.modalBody}>
                                {selectedDoc.category === 'ordonnance' ? (
                                    <View style={styles.previewContainer}>
                                        <OrdonnancePatientCard
                                            doc={selectedDoc}
                                            patient={patient}
                                            t={t}
                                            isRTL={isRTL}
                                        />
                                    </View>
                                ) : selectedDoc.isSecureDocument ? (
                                    <>
                                        <View style={styles.previewContainer}>
                                            <View style={styles.previewPaper}>
                                                <View style={styles.previewHeader}>
                                                    <Text style={styles.previewLogo}>TuniSanté</Text>
                                                    <Text style={styles.previewRef}>REF: DOC-{selectedDoc.id}</Text>
                                                </View>
                                                <View style={styles.previewContent}>
                                                    <Text style={styles.previewTitleText}>{t(selectedDoc.title)}</Text>
                                                    <Text style={styles.previewDoctorText}>
                                                        {t('issuedBy')} {getIssuerName(selectedDoc) || t('notSpecified')}
                                                    </Text>
                                                    {selectedDoc.securePreviewSummary ? (
                                                        <View style={styles.richContentBox}>
                                                            <Text style={styles.richContentTitle}>
                                                                {t('secureDocContentTitle')}
                                                            </Text>
                                                            <Text
                                                                selectable
                                                                style={[styles.contentParagraph, { marginTop: 4 }]}
                                                            >
                                                                {selectedDoc.securePreviewSummary}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    <View style={styles.stamp}>
                                                        {selectedDoc.contentSha256 ? (
                                                            <View style={styles.stampQrWrap}>
                                                                <QRCode
                                                                    value={String(selectedDoc.contentSha256)}
                                                                    size={120}
                                                                    color="#0f172a"
                                                                    backgroundColor="#ffffff"
                                                                />
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.modalDetails}>
                                            {getPractitionerName(selectedDoc) ? (
                                                <View style={styles.detailBox}>
                                                    <Text style={styles.detailLabel}>{t('practitioner')}</Text>
                                                    <Text style={styles.detailValue}>{getPractitionerName(selectedDoc)}</Text>
                                                </View>
                                            ) : null}
                                            <View style={styles.detailBox}>
                                                <Text style={styles.detailLabel}>{t('issuedBy')}</Text>
                                                <Text style={styles.detailValue}>
                                                    {getIssuerName(selectedDoc) || t('notSpecified')}
                                                </Text>
                                            </View>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.detailLabel}>{t('issueDate')}</Text>
                                                <Text style={styles.detailValue}>{selectedDoc.date}</Text>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.previewContainer}>
                                            <View style={styles.previewPaper}>
                                                <View style={styles.previewHeader}>
                                                    <Text style={styles.previewLogo}>TuniSanté</Text>
                                                    <Text style={styles.previewRef}>REF: DOC-{selectedDoc.id}</Text>
                                                </View>
                                                <View style={styles.previewContent}>
                                                    <Text style={styles.previewTitleText}>{t(selectedDoc.title)}</Text>
                                                    <Text style={styles.previewDoctorText}>
                                                        {t('issuedBy')} {getIssuerName(selectedDoc) || t('notSpecified')}
                                                    </Text>

                                                    <View style={styles.richContentBox}>
                                                        <Text style={styles.richContentTitle}>Contenu du document</Text>
                                                        {selectedDoc.category === 'biologie' ? (
                                                            <View style={styles.tableContainer}>
                                                                <View style={styles.tableHeader}>
                                                                    <Text style={[styles.tableCell, { flex: 2, color: '#64748b' }]}>Examen</Text>
                                                                    <Text style={[styles.tableCell, { color: '#64748b' }]}>Résultat</Text>
                                                                </View>
                                                                <View style={styles.tableRow}>
                                                                    <Text style={[styles.tableCell, { flex: 2 }]}>Hémoglobine</Text>
                                                                    <Text style={[styles.tableCell, { fontWeight: '700' }]}>14.2 g/dL</Text>
                                                                </View>
                                                                <View style={styles.tableRow}>
                                                                    <Text style={[styles.tableCell, { flex: 2 }]}>Glycémie à jeun</Text>
                                                                    <Text style={[styles.tableCell, { fontWeight: '700', color: '#ef4444' }]}>1.15 g/L</Text>
                                                                </View>
                                                                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>
                                                                    Conclusion: Glycémie légèrement élevée. À surveiller.
                                                                </Text>
                                                            </View>
                                                        ) : selectedDoc.category === 'radiologie' ? (
                                                            <View>
                                                                <View style={{ backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', padding: 15, alignItems: 'center', marginBottom: 15 }}>
                                                                    <Image
                                                                        source={{
                                                                            uri: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=600&auto=format&fit=crop'
                                                                        }}
                                                                        style={{ width: '100%', height: 150, tintColor: 'gray' }}
                                                                        resizeMode="cover"
                                                                        opacity={0.8}
                                                                    />
                                                                </View>
                                                                <Text style={[styles.contentParagraph, { fontWeight: '700', marginBottom: 5 }]}>Compte rendu :</Text>
                                                                <Text style={styles.contentParagraph}>
                                                                    Radiographie thoracique de face. Trame pulmonaire normale. Aucun épanchement pleural.
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={styles.contentParagraph}>
                                                                État général satisfaisant, pas de signes cliniques d&apos;infection. Pression artérielle à 120/80 mmHg. Le traitement actuel est bien toléré.
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.modalDetails}>
                                            {getPractitionerName(selectedDoc) ? (
                                                <View style={styles.detailBox}>
                                                    <Text style={styles.detailLabel}>{t('practitioner')}</Text>
                                                    <Text style={styles.detailValue}>{getPractitionerName(selectedDoc)}</Text>
                                                </View>
                                            ) : null}
                                            <View style={styles.detailBox}>
                                                <Text style={styles.detailLabel}>{t('issuedBy')}</Text>
                                                <Text style={styles.detailValue}>{getIssuerName(selectedDoc) || t('notSpecified')}</Text>
                                            </View>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.detailLabel}>{t('issueDate')}</Text>
                                                <Text style={styles.detailValue}>{selectedDoc.date}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: patientPastel.pageBg,
    },
    mainHeaderGradient: {
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 28,
    },
    headerMainTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: patientPastel.textHeading,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    headerMainSubtitle: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '500',
        lineHeight: 22,
    },
    searchFilterCard: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 22,
        marginHorizontal: 18,
        marginTop: -12,
        marginBottom: 18,
        padding: 16,
        ...theme.shadows.md,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
    },
    searchBoxInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInputText: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        fontSize: 14,
        color: theme.colors.textMain,
    },
    filterMockDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: patientPastel.pageBg,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterMockText: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        fontSize: 14,
        color: theme.colors.dark,
        fontWeight: '600',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 55,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...theme.shadows.md,
        zIndex: 100,
    },
    dropdownMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    dropdownMenuItemText: {
        fontSize: 14,
        color: theme.colors.textMain,
    },
    dropdownMenuItemTextActive: {
        color: theme.colors.dark,
        fontWeight: '600',
    },
    docCardModern: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 18,
        marginBottom: 0,
        ...theme.shadows.md,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
    },
    docCardPressed: {
        transform: [{ scale: 0.992 }],
    },
    docCardSecure: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.accentIndigo,
    },
    docHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconBoxModern: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docHeaderMeta: {
        flex: 1,
    },
    categoryPill: {
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        gap: 4,
    },
    categoryPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.dark,
    },
    categoryPillSub: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    secureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        alignSelf: 'flex-end',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    secureChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4f46e5',
    },
    docTitleModern: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    docDoctorModern: {
        fontSize: 13,
        color: theme.colors.textMuted,
        marginBottom: 14,
        fontWeight: '500',
    },
    docMetaRowModern: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: patientPastel.pageBg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    metaChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.dark,
    },
    docActionsModern: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    actionBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    actionBtnPrimaryText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    actionBtnGhost: {
        flex: 1,
        flexDirection: 'row',
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        backgroundColor: '#eff6ff',
    },
    actionBtnGhostText: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.primary,
    },
    scrollContent: {
        paddingBottom: 40,
        paddingTop: 4,
    },
    metaLabelText: {
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    metaValueText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.dark,
    },
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 28,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        ...theme.shadows.sm,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionContainer: {
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    /** Espacement vertical entre cartes document (web + natif). */
    docCardsStack: {
        gap: 16,
        marginTop: 4,
    },
    sectionHeaderNew: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitleNew: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.primary,
        marginLeft: 10,
    },
    sectionDescNew: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 15,
        marginLeft: 28,
    },
    dividerThin: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 20,
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#f1f5f9',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.dark,
    },
    closeBtnBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    closeBtn: {
        fontSize: 24,
        color: '#64748b',
        lineHeight: 28,
        textAlign: 'center',
    },
    modalBody: {
        padding: 20,
    },
    previewContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        ...theme.shadows.md,
        marginBottom: 25,
    },
    previewPaper: {
        minHeight: 300,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 10,
    },
    previewLogo: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    previewRef: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
    previewContent: {
        padding: 10,
    },
    previewTitleText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
        marginBottom: 5,
        textAlign: 'center',
    },
    previewDoctorText: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 30,
    },
    stampQrWrap: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    richContentBox: {
        marginTop: 10,
        marginBottom: 20,
    },
    richContentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: patientPastel.textHeading,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
    },
    tableContainer: {
        backgroundColor: patientPastel.pageBg,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 8,
        marginBottom: 8,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCell: {
        flex: 1,
        fontSize: 13,
        color: '#334155',
    },
    imagePlaceholder: {
        backgroundColor: patientPastel.pageBg,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderStyle: 'dashed',
        borderRadius: 12,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    contentParagraph: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 22,
    },
    stamp: {
        marginTop: 30,
        alignSelf: 'flex-end',
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    modalDetails: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    detailBox: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 15,
    },
    detailLabel: {
        fontSize: 11,
        color: theme.colors.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.dark,
    },
    downloadBtnLarge: {
        backgroundColor: theme.colors.dark,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 40,
    },
    downloadBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    prescriptionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 22,
    },
    prescriptionTitleCaps: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#111827',
        marginBottom: 12,
    },
    prescriptionDoctorName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    prescriptionMutedLine: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
        lineHeight: 20,
    },
    prescriptionBold: {
        fontWeight: '700',
        color: '#111827',
    },
    prescriptionPatientLine: {
        fontSize: 14,
        color: '#1f2937',
        marginTop: 4,
        lineHeight: 22,
    },
    prescriptionHr: {
        height: StyleSheet.hairlineWidth * 2,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    prescriptionDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    prescriptionDateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    prescriptionMedTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 22,
    },
    prescriptionMedBody: {
        fontSize: 14,
        color: '#334155',
        marginTop: 6,
        lineHeight: 21,
    },
    prescriptionMedNote: {
        fontSize: 12,
        color: '#94a3b8',
        fontStyle: 'italic',
        marginTop: 6,
        lineHeight: 18,
    },
    prescriptionQrWrap: {
        padding: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
});

export default Documents;
