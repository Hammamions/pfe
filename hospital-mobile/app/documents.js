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

const Documents = () => {
    const { t, i18n } = useTranslation();
    const { documents, setDocuments } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('Tous');
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);
    const isRTL = i18n.language === 'ar';

    const categories = [
        { id: 'Tous', label: 'allTypes' },
        { id: 'radiologie', label: 'radiologie' },
        { id: 'analyse', label: 'analyse' },
        { id: 'ordonnance', label: 'ordonnance' },
        { id: 'rapport', label: 'rapport' },
        { id: 'autre', label: 'autre' }
    ];

    const filteredDocs = documents.filter((doc) => {
        const matchesSearch =
            doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.doctor.toLowerCase().includes(searchTerm.toLowerCase());
        const docCat = doc.category === 'biologie' ? 'analyse' : doc.category;
        const matchesFilter = filterType === 'Tous' || docCat === filterType;
        return matchesSearch && matchesFilter;
    });

    const getDocIconAndColors = (category) => {
        switch (category) {
            case 'radiologie':
                return { icon: 'image', bg: '#f3e8ff', text: '#7c3aed' };
            case 'biologie':
            case 'analyse':
                return { icon: 'file-text', bg: '#eff6ff', text: '#3b82f6' };
            case 'ordonnance':
                return { icon: 'file-text', bg: '#dcfce7', text: '#22c55e' };
            case 'rapport':
                return { icon: 'file-text', bg: '#ffedd5', text: '#f97316' };
            default:
                return { icon: 'file', bg: '#f1f5f9', text: '#64748b' };
        }
    };

    const confirmDelete = (doc) => {
        setDocToDelete(doc);
        setShowDeleteModal(true);
    };

    const handleDelete = () => {
        setDocuments(documents.filter(d => d.id !== docToDelete.id));
        setShowDeleteModal(false);
        setDocToDelete(null);
    };
    const handleDownload = async (doc) => {
        try {
            const htmlContent = `
                <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <div style="border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; text-align: ${isRTL ? 'right' : 'left'};">
                        <h1 style="color: #0f172a; margin: 0;">TuniSanté</h1>
                        <p style="color: #64748b; margin: 5px 0 0 0;">REF: DOC-${doc.id}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <h2 style="font-size: 24px; color: #000; margin-bottom: 5px;">${t(doc.title)}</h2>
                        <p style="color: #64748b; font-size: 16px;">${t('issuedBy')} ${t(doc.doctor)}</p>
                    </div>

                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 40px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; width: 40%; border-bottom: 1px solid #e2e8f0;">${t('practitioner')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${t(doc.doctor)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t('date')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${doc.date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t('size')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${doc.size}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">${t('category')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'};">${t(doc.category)}</td>
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

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="documents" />

            <View style={[styles.mainHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerMainTitle, isRTL && { textAlign: 'right' }]}>{t('myDocuments')}</Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('documentsDesc')}</Text>
                </View>
            </View>

            <View style={[styles.searchFilterCard, { zIndex: 10 }]}>
                <View style={[styles.searchBoxInput, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Feather name="search" size={18} color="#94a3b8" />
                    <TextInput
                        style={[styles.searchInputText, isRTL && { textAlign: 'right' }, { outlineStyle: 'none' }]}
                        placeholder={t('searchDocument')}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                <View style={{ position: 'relative', zIndex: 20 }}>
                    <TouchableOpacity
                        style={[styles.filterMockDropdown, isRTL && { flexDirection: 'row-reverse' }]}
                        onPress={() => setFilterOpen(!filterOpen)}
                    >
                        <Text style={[styles.filterMockText, isRTL && { textAlign: 'right', marginLeft: 10, marginRight: 0 }]}>
                            {t(categories.find(c => c.id === filterType)?.label) || t('allTypes')}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    {filterOpen && (
                        <View style={styles.dropdownMenu}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.dropdownMenuItem, isRTL && { flexDirection: 'row-reverse' }]}
                                    onPress={() => {
                                        setFilterType(cat.id);
                                        setFilterOpen(false);
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
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {filteredDocs.map((doc) => {
                    const styling = getDocIconAndColors(doc.category);
                    return (
                        <TouchableOpacity
                            key={doc.id}
                            style={styles.docCardNew}
                            onPress={() => setSelectedDoc(doc)}
                        >
                            <View style={[styles.docHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={[styles.iconBoxPrimary, { backgroundColor: styling.bg }]}>
                                    <Feather name={styling.icon} size={22} color={styling.text} />
                                </View>
                                <View style={styles.categoryBadgeThin}>
                                    <Text style={styles.categoryBadgeTextThin}>{t(doc.category)}</Text>
                                </View>
                            </View>

                            <Text style={[styles.docTitleMain, isRTL && { textAlign: 'right' }]}>{t(doc.title)}</Text>
                            <Text style={[styles.docDoctorSub, isRTL && { textAlign: 'right' }]}>{t(doc.doctor)}</Text>

                            <View style={[styles.docMetaGridBox, isRTL && { alignItems: 'stretch' }]}>
                                <View style={[styles.docMetaRowLine, isRTL && { flexDirection: 'row-reverse', justifyContent: 'space-between' }, { marginBottom: 15 }]}>
                                    <Text style={[styles.metaLabelText, isRTL && { flex: 1, textAlign: 'right', marginLeft: 15 }]} numberOfLines={1}>{t('date')}</Text>
                                    <Text style={[styles.metaValueText, isRTL && { textAlign: 'left', minWidth: 80 }]}>{doc.date}</Text>
                                </View>
                                <View style={[styles.docMetaRowLine, isRTL && { flexDirection: 'row-reverse', justifyContent: 'space-between' }]}>
                                    <Text style={[styles.metaLabelText, isRTL && { flex: 1, textAlign: 'right', marginLeft: 15 }]} numberOfLines={1}>{t('size')}</Text>
                                    <Text style={[styles.metaValueText, isRTL && { textAlign: 'left', minWidth: 80 }]}>{doc.size}</Text>
                                </View>
                            </View>

                            <View style={[styles.docActionsBottomGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                                <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setSelectedDoc(doc)}>
                                    <Feather name="eye" size={16} color="#0f172a" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                                    <Text style={styles.actionBtnTextDark}>{t('view')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleDownload(doc)}>
                                    <Feather name="download" size={16} color="#0f172a" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                                    <Text style={styles.actionBtnTextDark}>{t('download')}</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => confirmDelete(doc)} style={styles.supprimerCenterBtn}>
                                <Feather name="trash-2" size={16} color="#ef4444" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                                <Text style={styles.supprimerCenterText}>{t('delete')}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                })}

                {filteredDocs.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>{t('noDocumentFound')}</Text>
                    </View>
                )}
            </ScrollView>

            <Modal transparent visible={!!selectedDoc} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { justifyContent: 'flex-end', borderBottomWidth: 0 }]}>
                            <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.closeBtnBox}>
                                <Text style={styles.closeBtn}>×</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedDoc && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.previewContainer}>
                                    <View style={styles.previewPaper}>
                                        <View style={styles.previewHeader}>
                                            <Text style={styles.previewLogo}>TuniSanté</Text>
                                            <Text style={styles.previewRef}>REF: DOC-{selectedDoc.id}</Text>
                                        </View>
                                        <View style={styles.previewContent}>
                                            <Text style={styles.previewTitleText}>{t(selectedDoc.title)}</Text>
                                            <Text style={styles.previewDoctorText}>{t('issuedBy')} {t(selectedDoc.doctor)}</Text>
                                            <View style={styles.dummyContent}>
                                                <View style={styles.dummyLine} />
                                                <View style={styles.dummyLine} />
                                                <View style={[styles.dummyLine, { width: '60%' }]} />
                                                <View style={styles.dummyLine} />
                                            </View>
                                            <View style={styles.stamp}>
                                                <Text style={styles.stampText}>{t('certified')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.modalDetails}>
                                    <View style={styles.detailBox}>
                                        <Text style={styles.detailLabel}>{t('practitioner')}</Text>
                                        <Text style={styles.detailValue}>{t(selectedDoc.doctor)}</Text>
                                    </View>
                                    <View style={styles.detailBox}>
                                        <Text style={styles.detailLabel}>{t('issueDate')}</Text>
                                        <Text style={styles.detailValue}>{selectedDoc.date}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={showDeleteModal} animationType="fade">
                <View style={styles.alertOverlay}>
                    <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>{t('deleteQuestion')}</Text>
                        <Text style={styles.alertSub}>{t('deleteConfirmMsg')}</Text>
                        <View style={styles.alertActions}>
                            <TouchableOpacity style={styles.alertCancel} onPress={() => setShowDeleteModal(false)}>
                                <Text style={styles.alertCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.alertConfirm} onPress={handleDelete}>
                                <Text style={styles.alertConfirmText}>{t('delete')}</Text>
                            </TouchableOpacity>
                        </View>
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 25,
        backgroundColor: '#fff',
    },
    headerMainTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 8,
    },
    headerMainSubtitle: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '500',
    },
    searchFilterCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    searchBoxInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
        marginBottom: 10,
        borderWidth: 0,
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
        backgroundColor: '#f8fafc',
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
    docCardNew: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    docHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    iconBoxPrimary: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBadgeThin: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
    },
    categoryBadgeTextThin: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMain,
    },
    docTitleMain: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    docDoctorSub: {
        fontSize: 14,
        color: theme.colors.textMuted,
        marginBottom: 25,
    },
    docMetaGridBox: {
        marginBottom: 20,
    },
    docMetaRowLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
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
    docActionsBottomGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    actionBtnOutline: {
        flexDirection: 'row',
        flex: 1,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    actionBtnTextDark: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.dark,
    },
    supprimerCenterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
    },
    supprimerCenterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: 15,
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
    dummyContent: {
        gap: 15,
    },
    dummyLine: {
        height: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 5,
    },
    stamp: {
        marginTop: 40,
        alignSelf: 'flex-end',
        borderWidth: 2,
        borderColor: '#22c55e',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 5,
        transform: [{ rotate: '-15deg' }],
    },
    stampText: {
        color: '#22c55e',
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
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
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 30,
    },
    alertContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
    },
    alertIcon: {
        fontSize: 40,
        marginBottom: 15,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
        marginBottom: 10,
    },
    alertSub: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 20,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    alertCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    alertConfirm: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#ef4444',
    },
    alertCancelText: {
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    alertConfirmText: {
        fontWeight: '700',
        color: '#fff',
    },
});

export default Documents;
