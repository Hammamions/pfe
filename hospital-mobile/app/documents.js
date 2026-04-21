import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';
import { sahloulLogoBase64 } from './logoBase64';

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

    const categories = [
        { id: 'Tous', label: 'allTypes' },
        { id: 'radiologie', label: 'radiologie' },
        { id: 'analyse', label: 'analyse' },
        { id: 'ordonnance', label: 'ordonnance' },
        { id: 'rapport', label: 'rapport' },
        { id: 'autre', label: 'autre' }
    ];

    const subCategories = {
        'radiologie': [
            { id: 'Tous', label: 'allTypes' },
            { id: 'echographie', label: 'echographie' },
            { id: 'irm', label: 'irm' },
            { id: 'scanner', label: 'scanner' },
            { id: 'radiographie', label: 'radiographie' }
        ],
        'analyse': [
            { id: 'Tous', label: 'allTypes' },
            { id: 'sang', label: 'sang' },
            { id: 'urine', label: 'urine' },
            { id: 'selles', label: 'selles' },
            { id: 'ponction', label: 'ponction' }
        ],
        'ordonnance': [
            { id: 'Tous', label: 'allTypes' },
            { id: 'medicamenteuse', label: 'medicamenteuse' },
            { id: 'soins_infirmiers', label: 'soins_infirmiers' },
            { id: 'kinesitherapie', label: 'kinesitherapie' }
        ],
        'rapport': [
            { id: 'Tous', label: 'allTypes' },
            { id: 'cr_operatoire', label: 'cr_operatoire' },
            { id: 'lettre_sortie', label: 'lettre_sortie' },
            { id: 'bilan_annuel', label: 'bilan_annuel' }
        ],
        'autre': [
            { id: 'Tous', label: 'allTypes' },
            { id: 'certificat', label: 'certificat' },
            { id: 'facture', label: 'facture' },
            { id: 'assurance', label: 'assurance' }
        ]
    };

    const [filterSubType, setFilterSubType] = useState('Tous');

    const filteredDocs = documents.filter((doc) => {
        const title = String(doc?.title || doc?.titre || '').toLowerCase();
        const doctor = String(doc?.doctor || doc?.praticien || '').toLowerCase();
        const term = String(searchTerm || '').toLowerCase();
        const matchesSearch =
            title.includes(term) ||
            doctor.includes(term);
        const docCategory = doc?.category || doc?.type || 'autre';
        const docCat = docCategory === 'biologie' ? 'analyse' : docCategory;
        const matchesFilter = filterType === 'Tous' || docCat === filterType;
        const matchesSubFilter = filterSubType === 'Tous' || doc.subCategory === filterSubType;
        return matchesSearch && matchesFilter && matchesSubFilter;
    });


    const now = new Date();
    const threshold = new Date();
    threshold.setMonth(now.getMonth() - 2);

    const recentDocs = filteredDocs.filter(d => new Date(d.createdAt || d.date) >= threshold);
    const historyDocs = filteredDocs.filter(d => new Date(d.createdAt || d.date) < threshold);

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
                        <p style="color: #64748b; font-size: 16px;">${t('issuedBy')} ${getIssuerName(doc) || t('notSpecified')}</p>
                    </div>

                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 40px;">
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
                                <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t('size')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'}; border-bottom: 1px solid #e2e8f0;">${doc.size}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">${t('category')}:</td>
                                <td style="padding: 10px 0; font-weight: bold; text-align: ${isRTL ? 'left' : 'right'};">${t(doc.category)} ${doc.subCategory ? '(' + t(doc.subCategory) + ')' : ''}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-bottom: 40px; line-height: 1.6;">
                        <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">Contenu du document</h3>
                        ${doc.category === 'biologie' ? `
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <tr style="background-color: #f1f5f9;"><th style="padding: 10px; border: 1px solid #e2e8f0;">Examen</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Résultat</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Valeur de référence</th></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Hémoglobine</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">14.2 g/dL</td><td style="padding: 10px; border: 1px solid #e2e8f0;">13.0 - 17.0</td></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Glycémie à jeun</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #ef4444;">1.15 g/L</td><td style="padding: 10px; border: 1px solid #e2e8f0;">0.70 - 1.10</td></tr>
                                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Cholestérol Total</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">1.85 g/L</td><td style="padding: 10px; border: 1px solid #e2e8f0;">&lt; 2.00</td></tr>
                            </table>
                            <p style="margin-top: 20px; color: #64748b;"><em>Conclusion: Glycémie légèrement élevée. À surveiller.</em></p>
                        ` : doc.category === 'radiologie' ? `
                            <div style="text-align: center; background-color: #000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                                <img src="https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=600&auto=format&fit=crop" style="max-height: 250px; border-radius: 8px; filter: grayscale(100%); mix-blend-mode: screen;" alt="Radiographie" />
                            </div>
                            <p style="margin-top: 20px; line-height: 1.8;"><strong>Compte rendu du radiologue :</strong><br/>Radiographie thoracique de face.<br/>La trame pulmonaire est d'épaisseur normale. Aucun foyer alvéolaire suspect ni épanchement pleural. La vascularisation est respectée.<br/><strong>Conclusion :</strong> Cliché normal sans signe évolutif.</p>
                        ` : doc.category === 'ordonnance' ? `
                            <ul style="list-style-type: none; padding: 0;">
                                <li style="margin-bottom: 15px;"><strong>1. Amoxicilline 1g</strong><br/>1 comprimé matin et soir pendant 6 jours.</li>
                                <li style="margin-bottom: 15px;"><strong>2. Paracétamol 1000mg</strong><br/>1 comprimé en cas de douleur, maximum 3 par jour.</li>
                            </ul>
                        ` : `
                            <p>Le patient s'est présenté ce jour pour un suivi régulier. L'état général est bon, pas de signes cliniques d'infection. Pression artérielle à 120/80 mmHg. Le traitement actuel est bien toléré et doit être poursuivi sans modification.</p>
                        `}
                    </div>

                    <div style="text-align: ${isRTL ? 'left' : 'right'}; padding-top: 20px; display: flex; justify-content: flex-end;">
                        <div style="margin-right: 20px;">
                           <img src="${sahloulLogoBase64}" width="120" style="transform: rotate(-10deg); filter: contrast(1.2);" alt="Sahloul Certification" />
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

    const renderDocCard = (doc) => {
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
                    <View style={[styles.categoryBadgeThin, { flexDirection: 'row', alignItems: 'center' }]}>
                        <Text style={styles.categoryBadgeTextThin}>{t(doc.category)}</Text>
                        {doc.subCategory && (
                            <Text style={[styles.categoryBadgeTextThin, { marginLeft: 5, color: '#64748b' }]}>
                                • {t(doc.subCategory)}
                            </Text>
                        )}
                    </View>
                </View>

                <Text style={[styles.docTitleMain, isRTL && { textAlign: 'right' }]}>{t(doc.title)}</Text>
                <Text style={[styles.docDoctorSub, isRTL && { textAlign: 'right' }]}>
                    {getIssuerName(doc) ? `${t('issuedBy')} ${getIssuerName(doc)}` : t('issuedBy')}
                </Text>

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

                <View style={[isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }, { gap: 10, zIndex: 20 }]}>
                    <View style={{ flex: 1, position: 'relative' }}>
                        <TouchableOpacity
                            style={[styles.filterMockDropdown, isRTL && { flexDirection: 'row-reverse' }]}
                            onPress={() => setFilterOpen(!filterOpen)}
                        >
                            <Text style={[styles.filterMockText, isRTL && { textAlign: 'right', marginLeft: 10, marginRight: 0 }]} numberOfLines={1}>
                                {t(categories.find(c => c.id === filterType)?.label) || t('allTypes')}
                            </Text>
                            <Feather name="chevron-down" size={16} color="#94a3b8" />
                        </TouchableOpacity>

                        {filterOpen === true && (
                            <View style={styles.dropdownMenu}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.dropdownMenuItem, isRTL && { flexDirection: 'row-reverse' }]}
                                        onPress={() => {
                                            setFilterType(cat.id);
                                            setFilterSubType('Tous');
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

                    {subCategories[filterType] && (
                        <View style={{ flex: 1, position: 'relative' }}>
                            <TouchableOpacity
                                style={[styles.filterMockDropdown, { borderColor: theme.colors.primary }, isRTL && { flexDirection: 'row-reverse' }]}
                                onPress={() => setFilterOpen('sub')}
                            >
                                <Text style={[styles.filterMockText, { color: theme.colors.primary }, isRTL && { textAlign: 'right', marginLeft: 10, marginRight: 0 }]} numberOfLines={1}>
                                    {t(subCategories[filterType].find(s => s.id === filterSubType)?.label) || t('allTypes')}
                                </Text>
                                <Feather name="chevron-down" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>

                            {filterOpen === 'sub' && (
                                <View style={styles.dropdownMenu}>
                                    {subCategories[filterType].map((sub) => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={[styles.dropdownMenuItem, isRTL && { flexDirection: 'row-reverse' }]}
                                            onPress={() => {
                                                setFilterSubType(sub.id);
                                                setFilterOpen(false);
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
                        {recentDocs.map(renderDocCard)}
                    </View>
                )}

                {historyDocs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={[styles.sectionHeaderNew, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="archive" size={18} color="#64748b" />
                            <Text style={[styles.sectionTitleNew, { color: '#64748b' }, isRTL && { marginRight: 10, marginLeft: 0 }]}>{t('pastDocuments')}</Text>
                        </View>
                        <View style={styles.dividerThin} />
                        {historyDocs.map(renderDocCard)}
                    </View>
                )}

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
                                            <Text style={styles.previewDoctorText}>{t('issuedBy')} {getIssuerName(selectedDoc) || t('notSpecified')}</Text>

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
                                                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>Conclusion: Glycémie légèrement élevée. À surveiller.</Text>
                                                    </View>
                                                ) : selectedDoc.category === 'radiologie' ? (
                                                    <View>
                                                        <View style={{ backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', padding: 15, alignItems: 'center', marginBottom: 15 }}>
                                                            <Image
                                                                source={{ uri: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=600&auto=format&fit=crop" }}
                                                                style={{ width: '100%', height: 150, tintColor: 'gray' }}
                                                                resizeMode="cover"
                                                                opacity={0.8}
                                                            />
                                                        </View>
                                                        <Text style={[styles.contentParagraph, { fontWeight: '700', marginBottom: 5 }]}>Compte rendu :</Text>
                                                        <Text style={styles.contentParagraph}>Radiographie thoracique de face. Trame pulmonaire normale. Aucun épanchement pleural.</Text>
                                                    </View>
                                                ) : selectedDoc.category === 'ordonnance' ? (
                                                    <View style={{ gap: 12 }}>
                                                        <Text style={styles.contentParagraph}><Text style={{ fontWeight: '700' }}>1. Amoxicilline 1g</Text>{"\n"}1 cp matin et soir pendant 6 jours.</Text>
                                                        <Text style={styles.contentParagraph}><Text style={{ fontWeight: '700' }}>2. Paracétamol 1000mg</Text>{"\n"}1 cp en cas de douleur (max 3/j).</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.contentParagraph}>État général satisfaisant, pas de signes cliniques d'infection. Pression artérielle à 120/80 mmHg. Le traitement actuel est bien toléré.</Text>
                                                )}
                                            </View>

                                            <View style={styles.stamp}>
                                                <Image
                                                    source={{ uri: sahloulLogoBase64 }}
                                                    style={{ width: 100, height: 100, transform: [{ rotate: '-5deg' }] }}
                                                    resizeMode="contain"
                                                />
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
    sectionContainer: {
        marginBottom: 30,
        paddingHorizontal: 20,
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
    richContentBox: {
        marginTop: 10,
        marginBottom: 20,
    },
    richContentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
    },
    tableContainer: {
        backgroundColor: '#f8fafc',
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
        backgroundColor: '#f8fafc',
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
