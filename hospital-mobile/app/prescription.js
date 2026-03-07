import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const Prescription = () => {
    const { t, i18n } = useTranslation();
    const { prescriptions, historicalPrescriptions, labResults } = useApp();
    const [activeTab, setActiveTab] = useState('ordonnances');
    const [showContactModal, setShowContactModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [contactForm, setContactForm] = useState({ subject: '', message: '' });
    const isRTL = i18n.language === 'ar';

    const handleSendMessage = () => {

        setShowContactModal(false);
        setContactForm({ subject: '', message: '' });
    };

    const handleDownload = async (item, type = 'prescription') => {
        try {
            const isPrescription = type === 'prescription';
            const htmlContent = `
                <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <div style="border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; text-align: ${isRTL ? 'right' : 'left'};">
                        <h1 style="color: #0f172a; margin: 0;">TuniSanté</h1>
                        <p style="color: #64748b; margin: 5px 0 0 0;">REF: ${isPrescription ? 'ORD' : 'LAB'}-${item.id}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <h2 style="font-size: 24px; color: #000; margin-bottom: 5px;">${isPrescription ? t('prescription') : t(item.title)}</h2>
                        <p style="color: #64748b; font-size: 16px;">${isPrescription ? t('doctor') + ': ' + t(item.doctor) : t(item.lab)}</p>
                    </div>

                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 40px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; width: 40%; border-bottom: 1px solid #e2e8f0;">${t('date')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${item.date}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: ${isRTL ? 'left' : 'right'}; padding-top: 20px;">
                        <div style="display: inline-block; border: 2px solid ${theme.colors.success || '#22c55e'}; padding: 10px 20px; border-radius: 8px; transform: rotate(-10deg);">
                            <span style="color: ${theme.colors.success || '#22c55e'}; font-weight: bold; font-size: 16px; text-transform: uppercase;">${t('certified')}</span>
                        </div>
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
                        filename: `${isPrescription ? 'Prescription' : 'Analyse'}_${item.id}.pdf`,
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

    const PrescriptionCard = ({ item, isHistory = false }) => (
        <View style={[styles.card, isHistory && styles.cardHistory]}>
            <View style={[styles.cardHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={styles.doctorName}>{t(item.doctor)}</Text>
                    <Text style={styles.prescriptionDate}>{t('prescribedOn')} {item.date}</Text>
                </View>
                {!isHistory && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>{t('active')}</Text></View>}
            </View>

            <View style={styles.medicationList}>
                {item.medications.map((med, idx) => (
                    <View key={idx} style={[styles.medItem, isRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={[styles.medInfo, isRTL && { paddingLeft: 0, paddingRight: 10, alignItems: 'flex-end', marginLeft: 15 }]}>
                            <Text style={styles.medName}>{t(med.name)}</Text>
                            <View style={[styles.medSpecs, isRTL && { flexDirection: 'row-reverse' }]}>
                                <Text style={styles.medSpecText}>{t('dosage')} {med.dosage} {t(med.dosageUnit)}</Text>
                                <Text style={[styles.medSpecText, { marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }]}>• {med.freqCount}x/{t(med.freqPeriod)}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            {!isHistory && (
                <View style={[styles.cardActions, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={[styles.downloadBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={() => handleDownload(item, 'prescription')}>
                        <Feather name="download" size={16} color="#0f172a" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                        <Text style={styles.downloadBtnText}>{t('download')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.contactBtn, isRTL && { flexDirection: 'row-reverse' }]}
                        onPress={() => { setSelectedDoctor(item); setShowContactModal(true); }}
                    >
                        <Feather name="message-circle" size={16} color="#ffffff" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                        <Text style={styles.contactBtnText}>{t('contactDoctor')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const LabResultCard = ({ result }) => (
        <View style={styles.card}>
            <View style={[styles.cardHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={styles.doctorName}>{t(result.title)}</Text>
                    <Text style={styles.prescriptionDate}>{result.date} • {t(result.lab)}</Text>
                </View>
                <TouchableOpacity style={styles.miniDownloadBtn} onPress={() => handleDownload(result, 'lab')}>
                    <Feather name="download" size={16} color="#0f172a" />
                </TouchableOpacity>
            </View>

            <View style={styles.table}>
                <View style={[styles.tableHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.tableHeadText, { flex: 2 }, isRTL && { textAlign: 'right' }]}>{t('parameter')}</Text>
                    <Text style={[styles.tableHeadText, { flex: 1 }, isRTL && { textAlign: 'right' }]}>{t('value')}</Text>
                    <Text style={[styles.tableHeadText, { flex: 1.5 }, isRTL && { textAlign: 'right' }]}>{t('reference')}</Text>
                </View>
                {result.parameters.map((param, idx) => (
                    <View key={idx} style={[styles.tableRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.tableCellText, { flex: 2 }, isRTL && { textAlign: 'right' }]}>{t(param.name)}</Text>
                        <Text style={[styles.tableCellText, { flex: 1, fontWeight: '800' }, isRTL && { textAlign: 'right' }, param.status !== 'normal' && { color: theme.colors.danger }]}>
                            {param.value}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1.5 }, isRTL && { textAlign: 'right' }]}>{param.reference}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.interpretationBox, isRTL && { alignItems: 'flex-end' }]}>
                <Text style={styles.interpretationLabel}>{t('interpretation')}</Text>
                <Text style={[styles.interpretationText, isRTL && { textAlign: 'right' }]}>
                    {typeof result.interpretation === 'object' ? t(result.interpretation.key, result.interpretation.params) : t(result.interpretation)}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="prescription" />

            <View style={[styles.mainHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerMainTitle, isRTL && { textAlign: 'right' }]}>{t('navPrescriptions')}</Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('manageDocuments')}</Text>
                </View>
            </View>

            <View style={styles.tabsWrapper}>
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'ordonnances' && styles.tabActive]}
                        onPress={() => setActiveTab('ordonnances')}
                    >
                        <Text style={[styles.tabText, activeTab === 'ordonnances' && styles.tabTextActive]}>{t('prescriptionsTab')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'analyses' && styles.tabActive]}
                        onPress={() => setActiveTab('analyses')}
                    >
                        <Text style={[styles.tabText, activeTab === 'analyses' && styles.tabTextActive]}>{t('analysesTab')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {activeTab === 'ordonnances' ? (
                    <>
                        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('activePrescriptionsLabel')} ({prescriptions.length})</Text>
                        {prescriptions.map(p => <PrescriptionCard key={p.id} item={p} />)}

                        {historicalPrescriptions.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 20 }, isRTL && { textAlign: 'right' }]}>{t('history')} ({historicalPrescriptions.length})</Text>
                                {historicalPrescriptions.map(p => <PrescriptionCard key={p.id} item={p} isHistory />)}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {labResults.map(r => <LabResultCard key={r.id} result={r} />)}
                    </>
                )}
            </ScrollView>


            <Modal transparent visible={showContactModal} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('contactDoctor')}</Text>
                            <TouchableOpacity onPress={() => setShowContactModal(false)}>
                                <Text style={styles.closeBtn}>×</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedDoctor && (
                            <View style={styles.modalBody}>
                                <View style={[styles.doctorHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <View style={[styles.doctorMeta, isRTL && { paddingLeft: 0, paddingRight: 15, alignItems: 'flex-end' }]}>
                                        <Text style={styles.modalDoctorName}>{t(selectedDoctor.doctor)}</Text>
                                        <Text style={styles.modalDoctorSpec}>{t(selectedDoctor.specialty)}</Text>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('subject')}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && { textAlign: 'right' }]}
                                        placeholder={t('subjectPlaceholder')}
                                        value={contactForm.subject}
                                        onChangeText={(v) => setContactForm({ ...contactForm, subject: v })}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('message')}</Text>
                                    <TextInput
                                        style={[styles.textArea, isRTL && { textAlign: 'right' }]}
                                        placeholder={t('messagePlaceholder')}
                                        multiline
                                        numberOfLines={5}
                                        value={contactForm.message}
                                        onChangeText={(v) => setContactForm({ ...contactForm, message: v })}
                                    />
                                </View>

                                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                                    <Text style={styles.sendBtnText}>{t('send')}</Text>
                                </TouchableOpacity>
                            </View>
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
        backgroundColor: theme.colors.background,
    },
    mainHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerMainTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    headerMainSubtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    tabsWrapper: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#fff',
        ...theme.shadows.sm,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    tabTextActive: {
        color: theme.colors.dark,
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 15,
        ...theme.shadows.sm,
    },
    cardHistory: {
        opacity: 0.8,
        backgroundColor: '#f8fafc',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 15,
    },
    doctorName: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    prescriptionDate: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    activeBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#166534',
    },
    medicationList: {
        marginBottom: 20,
    },
    medItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    medIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff1f2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    medInfo: {
        flex: 1,
        paddingLeft: 12,
    },
    medName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textMain,
        marginBottom: 2,
    },
    medSpecs: {
        flexDirection: 'row',
    },
    medSpecText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    downloadBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: theme.colors.dark,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    downloadBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textMain,
    },
    contactBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },

    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableHeadText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textMuted,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCellText: {
        fontSize: 13,
        color: theme.colors.textMain,
    },
    interpretationBox: {
        backgroundColor: '#eff6ff',
        padding: 15,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    interpretationLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.primary,
        marginBottom: 5,
    },
    interpretationText: {
        fontSize: 13,
        color: '#1e40af',
        lineHeight: 18,
        fontWeight: '500',
    },
    miniDownloadBtn: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '80%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: theme.colors.dark,
    },
    closeBtn: {
        fontSize: 30,
        color: theme.colors.textMuted,
    },
    modalBody: {
        padding: 25,
    },
    doctorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    doctorAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    doctorMeta: {
        paddingLeft: 15,
    },
    modalDoctorName: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.dark,
    },
    modalDoctorSpec: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textMain,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
    },
    textArea: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        textAlignVertical: 'top',
    },
    sendBtn: {
        backgroundColor: theme.colors.dark,
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        ...theme.shadows.md,
    },
    sendBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default Prescription;
