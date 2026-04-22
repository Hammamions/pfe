
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { dashboardVibe, patientPastel, theme } from '../theme';
import { useApp } from './AppContext';
import CustomCalendar from './components/CustomCalendar';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const isRawConsultationReportEntry = (entry) => {
    const raw = String(entry || '').trim();
    if (!raw || !raw.startsWith('{') || !raw.endsWith('}')) return false;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.kind === 'consultation_report';
    } catch {
        return false;
    }
};

const cleanMedicalHistory = (list) =>
    (Array.isArray(list) ? list : []).filter((item) => !isRawConsultationReportEntry(item));

const extractConsultationReportSummaries = (list) => {
    const out = [];
    for (const entry of Array.isArray(list) ? list : []) {
        if (!isRawConsultationReportEntry(entry)) continue;
        try {
            const p = JSON.parse(String(entry).trim());
            const d = p.createdAt ? new Date(p.createdAt) : null;
            const dateStr = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : '';
            const doctor = String(p.medecin || '').trim();
            const secure = Boolean(p.sentSecure);
            out.push({
                id: String(p.id || `${dateStr}-${out.length}`),
                dateStr,
                doctor,
                secure,
                preview: String(p.summary || '').trim().slice(0, 120)
            });
        } catch {
        }
    }
    return out;
};

const InfoField = ({ label, value, isEditing, isRTL, t, multiline = false, onChangeText, required = false, error = false, editable = true, keyboardType = 'default' }) => (
    <View style={styles.infoField}>
        <View style={[styles.labelRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
            {required && isEditing && <Text style={{ color: '#ef4444', marginLeft: 4, fontWeight: 'bold' }}>*</Text>}
        </View>
        <View style={[
            styles.inputWrapper,
            isRTL && { flexDirection: 'row-reverse' },
            isEditing && error && { borderColor: '#ef4444', borderBottomWidth: 2 }
        ]}>
            {isEditing ? (
                <TextInput
                    style={[styles.input, isRTL && { textAlign: 'right' }, { flex: 1 }]}
                    value={value}
                    onChangeText={onChangeText}
                    multiline={multiline}
                    placeholder=""
                    editable={editable}
                    keyboardType={keyboardType}
                />
            ) : (
                <Text selectable style={[styles.valueText, isRTL && { textAlign: 'right' }, { flex: 1 }]}>{value || t('notSpecified')}</Text>
            )}
        </View>
        {isEditing && error && <Text style={[styles.errorText, isRTL && { textAlign: 'right' }]}>{error}</Text>}
    </View>
);

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { patient, setPatient } = useApp();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [bloodModalVisible, setBloodModalVisible] = useState(false);
    const [editData, setEditData] = useState({
        ...patient,
        history: cleanMedicalHistory(patient.history)
    });
    const [activeModal, setActiveModal] = useState(null);
    const [newTagValue, setNewTagValue] = useState('');
    const [errors, setErrors] = useState({});
    const [showDateModal, setShowDateModal] = useState(false);
    const isRTL = i18n.language === 'ar';

    const consultationRows = useMemo(
        () => (!isEditing ? extractConsultationReportSummaries(patient.history) : []),
        [isEditing, patient.history]
    );

    useEffect(() => {
        if (!isEditing) {
            setEditData({
                ...patient,
                history: cleanMedicalHistory(patient.history)
            });
        }
    }, [patient, isEditing]);

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
    };

    const validatePhone = (phone) => {
        return String(phone).match(/^\d{8}$/);
    };

    const validateDate = (date) => {
        return String(date).match(/^\d{4}-\d{2}-\d{2}$/) || String(date).match(/^\d{2}\/\d{2}\/\d{4}$/);
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setEditData({
                ...patient,
                history: cleanMedicalHistory(patient.history)
            });
            setErrors({});
        } else {
            setEditData({
                ...patient,
                history: cleanMedicalHistory(patient.history)
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSave = () => {
        const newErrors = {};
        const emergency = editData.emergencyContact || {};
        if (!editData.lastName?.trim()) newErrors.lastName = t('fieldRequired');
        if (!editData.firstName?.trim()) newErrors.firstName = t('fieldRequired');
        if (!editData.birthDate?.trim()) newErrors.birthDate = t('fieldRequired');
        if (!editData.email?.trim()) newErrors.email = t('fieldRequired');
        else if (!validateEmail(editData.email)) newErrors.email = t('invalidEmail');

        if (!editData.phone?.trim()) newErrors.phone = t('fieldRequired');
        else if (!validatePhone(editData.phone)) newErrors.phone = t('invalidPhone');

        if (!editData.bloodGroup?.trim()) newErrors.bloodGroup = t('fieldRequired');
        if (!editData.socialSecurity?.trim()) newErrors.socialSecurity = t('fieldRequired');

        if (!emergency.name?.trim()) newErrors.emergencyName = t('fieldRequired');
        if (!emergency.relation?.trim()) newErrors.emergencyRelation = t('fieldRequired');
        if (!emergency.phone?.trim()) newErrors.emergencyPhone = t('fieldRequired');
        else if (!validatePhone(emergency.phone)) newErrors.emergencyPhone = t('invalidPhone');

        if (!emergency.email?.trim()) newErrors.emergencyEmail = t('fieldRequired');
        else if (!validateEmail(emergency.email)) newErrors.emergencyEmail = t('invalidEmail');

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        setPatient({
            ...editData,
            history: cleanMedicalHistory(editData.history)
        });
        setIsEditing(false);
        setErrors({});
    };

    const handleInputChange = (field, value, section = null) => {
        if (section) {
            setEditData({
                ...editData,
                [section]: { ...editData[section], [field]: value }
            });
        } else {
            setEditData({ ...editData, [field]: value });
        }
    };

    const handleRemoveTag = (section, index) => {
        setEditData({
            ...editData,
            [section]: editData[section].filter((_, i) => i !== index)
        });
    };

    const handleAddTag = () => {
        if (!newTagValue.trim()) return;
        setEditData({
            ...editData,
            [activeModal]: [...(editData[activeModal] || []), newTagValue.trim()]
        });
        setActiveModal(null);
        setNewTagValue('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />

            <HeaderSidebar activeScreen="profile" />

            <View style={[styles.mainHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerMainTitle, isRTL && { textAlign: 'right' }]}>{t('navProfile')}</Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('personalInfoProfileDesc')}</Text>
                </View>
                <TouchableOpacity onPress={handleEditToggle} style={styles.modifyBtn}>
                    <Text style={styles.modifyBtnText}>{isEditing ? t('cancel') : t('modify')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.heroCard}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarText}>
                            {(patient.firstName || patient.prenom || "?").charAt(0).toUpperCase()}
                            {(patient.lastName || patient.nom || "").charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.heroName}>{patient.firstName} {patient.lastName}</Text>
                    <Text style={styles.heroEmail}>{patient.email}</Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroInfoList}>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right' }]}>
                                {t('patientSince')} {patient.patientSince}
                            </Text>
                        </View>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right' }]}>
                                {t('bornOn')} {patient.birthDate}
                            </Text>
                        </View>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right' }]}>{patient.bloodGroup}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('personalInfo')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('personalContactDesc')}</Text>

                    <InfoField label={t('lastName')} value={isEditing ? editData.lastName : patient.lastName} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('lastName', text)} required error={errors.lastName} />
                    <InfoField label={t('firstName')} value={isEditing ? editData.firstName : patient.firstName} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('firstName', text)} required error={errors.firstName} />
                    {isEditing ? (
                        <TouchableOpacity onPress={() => setShowDateModal(true)}>
                            <InfoField label={t('birthDate')} value={editData.birthDate} isEditing={true} isRTL={isRTL} t={t} required error={errors.birthDate} />
                        </TouchableOpacity>
                    ) : (
                        <InfoField label={t('birthDate')} value={patient.birthDate} isEditing={false} isRTL={isRTL} t={t} required error={errors.birthDate} />
                    )}
                    <InfoField label={t('email')} value={isEditing ? editData.email : patient.email} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text)} required error={errors.email} />
                    <InfoField label={t('phone')} value={isEditing ? editData.phone : patient.phone} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text)} keyboardType="phone-pad" required error={errors.phone} />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfo')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfoDescHeader')}</Text>

                    {isEditing ? (
                        <TouchableOpacity onPress={() => setBloodModalVisible(true)}>
                            <InfoField label={t('bloodGroup')} value={editData.bloodGroup} isEditing={true} isRTL={isRTL} t={t} required error={errors.bloodGroup} editable={false} />
                        </TouchableOpacity>
                    ) : (
                        <InfoField label={t('bloodGroup')} value={patient.bloodGroup} isEditing={false} isRTL={isRTL} t={t} required error={errors.bloodGroup} />
                    )}
                    <InfoField label={t('socialSecurity')} value={isEditing ? editData.socialSecurity : patient.socialSecurity} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('socialSecurity', text)} required error={errors.socialSecurity} />

                    <View style={styles.infoField}>
                        <Text style={[styles.infoLabel, { marginBottom: 10 }, isRTL && { textAlign: 'right' }]}>{t('allergies')}</Text>
                        <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                            {((isEditing ? editData.allergies : patient.allergies) || []).map((tag, i) => (
                                <View key={i} style={styles.tagAllergy}>
                                    <Text selectable style={styles.tagAllergyText}>{t(tag)}</Text>
                                    {isEditing && (
                                        <TouchableOpacity onPress={() => handleRemoveTag('allergies', i)} style={styles.removeTagBtn}>
                                            <Text style={styles.removeTagText}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {isEditing && (
                                <TouchableOpacity onPress={() => setActiveModal('allergies')} style={styles.addTagBtn}>
                                    <Text style={styles.addTagBtnText}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.infoField}>
                        <Text style={[styles.infoLabel, { marginBottom: 10 }, isRTL && { textAlign: 'right' }]}>{t('medicalHistory')}</Text>
                        <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                            {cleanMedicalHistory(isEditing ? editData.history : patient.history).map((tag, i) => (
                                <View key={i} style={styles.tagHistory}>
                                    <Text selectable style={styles.tagHistoryText}>{t(tag)}</Text>
                                    {isEditing && (
                                        <TouchableOpacity onPress={() => handleRemoveTag('history', i)} style={styles.removeTagBtn}>
                                            <Text style={styles.removeTagTextHistory}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {isEditing && (
                                <TouchableOpacity onPress={() => setActiveModal('history')} style={styles.addTagBtn}>
                                    <Text style={styles.addTagBtnText}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {!isEditing && consultationRows.length > 0 ? (
                        <View style={[styles.infoField, { marginTop: 14 }]}>
                            <Text style={[styles.infoLabel, { marginBottom: 8 }, isRTL && { textAlign: 'right' }]}>
                                {t('consultationReportsSection')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionSubtitle,
                                    { marginBottom: 10, fontSize: 12 },
                                    isRTL && { textAlign: 'right' }
                                ]}
                            >
                                {t('consultationReportsSecureHint')}
                            </Text>
                            {consultationRows.map((row) => (
                                <View
                                    key={row.id}
                                    style={[
                                        styles.tagHistory,
                                        { alignSelf: 'stretch', marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12 }
                                    ]}
                                >
                                    <Text selectable style={[styles.tagHistoryText, { lineHeight: 20 }]}>
                                        {(row.dateStr ? `${row.dateStr} · ` : '') + (row.doctor ? `${row.doctor} · ` : '')}
                                        {row.secure ? t('consultationReportsSecureLabel') : row.preview || t('consultationReportsNoPreview')}
                                    </Text>
                                </View>
                            ))}
                            <TouchableOpacity onPress={() => router.push('/documents')} activeOpacity={0.85}>
                                <Text style={[styles.linkToDocuments, isRTL && { textAlign: 'right' }]}>
                                    {t('consultationReportsOpenDocuments')} →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContact')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContactDescHeader')}</Text>

                    <InfoField
                        label={t('fullName')}
                        value={isEditing ? editData.emergencyContact?.name : patient.emergencyContact?.name}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('name', text, 'emergencyContact')}
                        required
                        error={errors.emergencyName}
                    />
                    <InfoField
                        label={t('relation')}
                        value={isEditing ? editData.emergencyContact?.relation : patient.emergencyContact?.relation}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('relation', text, 'emergencyContact')}
                        required
                        error={errors.emergencyRelation}
                    />
                    <InfoField
                        label={t('phone')}
                        value={isEditing ? editData.emergencyContact?.phone : patient.emergencyContact?.phone}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('phone', text, 'emergencyContact')}
                        keyboardType="phone-pad"
                        required
                        error={errors.emergencyPhone}
                    />
                    <InfoField
                        label={t('email')}
                        value={isEditing ? editData.emergencyContact?.email : patient.emergencyContact?.email}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('email', text, 'emergencyContact')}
                        keyboardType="email-address"
                        required
                        error={errors.emergencyEmail}
                    />
                </View>

                {isEditing && (
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={handleSave} activeOpacity={0.9} style={{ borderRadius: 100, overflow: 'hidden' }}>
                            <LinearGradient
                                colors={dashboardVibe.primaryCtaGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveBtnGradient}
                            >
                                <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            <Modal
                transparent
                visible={!!activeModal}
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {activeModal === 'allergies' ? t('newAllergy') : t('newHistoryEntry')}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newTagValue}
                            onChangeText={setNewTagValue}
                            autoFocus
                            placeholder="..."
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setActiveModal(null)}>
                                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={handleAddTag}>
                                <Text style={styles.modalConfirmText}>{t('confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                transparent
                visible={bloodModalVisible}
                animationType="fade"
                onRequestClose={() => setBloodModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('bloodGroup')}</Text>
                        <View style={styles.bloodOptions}>
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                <TouchableOpacity
                                    key={bg}
                                    style={styles.bloodOption}
                                    onPress={() => {
                                        if (isEditing) {
                                            setEditData(prev => ({ ...prev, bloodGroup: bg }));
                                        }
                                        setBloodModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.bloodOptionText}>{bg}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setBloodModalVisible(false)}>
                                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal transparent visible={showDateModal} animationType="fade" onRequestClose={() => setShowDateModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('birthDate')}</Text>
                        <CustomCalendar
                            visible={showDateModal}
                            onClose={() => setShowDateModal(false)}
                            onSelect={(date) => {
                                handleInputChange('birthDate', date);
                                setShowDateModal(false);
                            }}
                            initialDate={(isEditing ? editData.birthDate : patient.birthDate) || new Date().toISOString().split('T')[0]}
                            isRTL={isRTL}
                            t={t}
                        />
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
    mainHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: patientPastel.pageBg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerMainTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: patientPastel.textHeading,
    },
    headerMainSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    modifyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: patientPastel.primaryDeep,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modifyBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 0,
    },
    heroCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    avatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: patientPastel.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#fff',
    },
    heroName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 4,
    },
    heroEmail: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 25,
    },
    heroDivider: {
        height: 1,
        width: '100%',
        backgroundColor: '#f1f5f9',
        marginBottom: 25,
    },
    heroInfoList: {
        alignSelf: 'flex-start',
        width: '100%',
        gap: 15,
    },
    heroInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroInfoText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 24,
    },
    infoField: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: patientPastel.inputBg,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: patientPastel.borderInput,
    },
    input: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
        padding: 0,
        outlineStyle: 'none',
    },
    valueText: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
    },
    bloodPill: {
        backgroundColor: '#fff1f2',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fecdd3',
        alignSelf: 'flex-start',
    },
    bloodPillText: {
        color: '#e11d48',
        fontWeight: '700',
        fontSize: 16,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagAllergy: {
        backgroundColor: '#e11d48',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tagAllergyText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    tagHistory: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tagHistoryText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
    },
    addTagBtn: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    addTagBtnText: {
        fontSize: 18,
        fontWeight: '800',
        color: patientPastel.textHeading,
    },
    removeTagBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#e11d48',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    removeTagText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    removeTagTextHistory: {
        color: 'rgba(71, 85, 105, 0.5)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    bloodOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 10,
    },
    bloodOption: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    bloodOptionText: {
        color: patientPastel.textHeading,
        fontWeight: '600',
    },
    actions: {
        marginTop: 10,
        marginBottom: 40,
    },
    saveBtnGradient: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 15,
    },
    modalInput: {
        backgroundColor: patientPastel.inputBg,
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: patientPastel.borderInput,
        marginBottom: 20,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelText: {
        color: '#64748b',
        fontWeight: '600',
        padding: 10,
    },
    modalConfirm: {
        backgroundColor: patientPastel.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: '700',
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: patientPastel.pageBg,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    appHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: patientPastel.textHeading,
        letterSpacing: -0.5,
    },
    appHeaderSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
    },
    menuButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    linkToDocuments: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: '700',
        color: patientPastel.primaryDeep,
    },
});

export default Profile;
