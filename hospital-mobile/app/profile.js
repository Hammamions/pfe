
import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const InfoField = ({ label, value, icon, iconType = 'feather', isEditing, isRTL, t, multiline = false, onChangeText }) => (
    <View style={styles.infoField}>
        <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
        <View style={[styles.inputWrapper, isRTL && { flexDirection: 'row-reverse' }]}>
            {icon && (
                iconType === 'feather' ?
                    <Feather name={icon} size={18} color="#94a3b8" style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} /> :
                    <Ionicons name={icon} size={18} color="#94a3b8" style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
            )}
            {isEditing ? (
                <TextInput
                    style={[styles.input, isRTL && { textAlign: 'right' }, { flex: 1 }]}
                    value={value}
                    onChangeText={onChangeText}
                    multiline={multiline}
                />
            ) : (
                <Text style={[styles.valueText, isRTL && { textAlign: 'right' }, { flex: 1 }]}>{value || t('notSpecified')}</Text>
            )}
        </View>
    </View>
);

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { patient, setPatient } = useApp();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [bloodModalVisible, setBloodModalVisible] = useState(false);
    const [editData, setEditData] = useState({ ...patient });
    const [activeModal, setActiveModal] = useState(null);
    const [newTagValue, setNewTagValue] = useState('');
    const isRTL = i18n.language === 'ar';

    const handleEditToggle = () => {
        if (isEditing) {
            setEditData({ ...patient });
        }
        setIsEditing(!isEditing);
    };

    const handleSave = () => {
        const isEmergencyComplete = editData.emergencyContact.name.trim() &&
            editData.emergencyContact.relation.trim() &&
            editData.emergencyContact.phone.trim() &&
            editData.emergencyContact.email.trim();

        const isMainComplete = editData.lastName.trim() && editData.firstName.trim() &&
            editData.birthDate.trim() && editData.email.trim() &&
            editData.phone.trim() && editData.bloodGroup.trim() &&
            editData.socialSecurity.trim();

        if (!isMainComplete || !isEmergencyComplete) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        setPatient({ ...editData });
        setIsEditing(false);
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
                    {isEditing ? (
                        <Text style={styles.modifyBtnText}>{t('cancel')}</Text>
                    ) : (
                        <>
                            <Feather name="edit" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.modifyBtnText}>{t('modify')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.heroCard}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarText}>
                            {t(patient.firstName)?.charAt(0)}{t(patient.lastName)?.charAt(0)}
                        </Text>
                    </View>
                    <Text style={styles.heroName}>{t(patient.firstName)} {t(patient.lastName)}</Text>
                    <Text style={styles.heroEmail}>{patient.email}</Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroInfoList}>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="user" size={16} color="#94a3b8" />
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right', marginRight: 0, marginLeft: 12 }]}>
                                {t('patientSince')} {patient.patientSince}
                            </Text>
                        </View>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="calendar" size={16} color="#94a3b8" />
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right', marginRight: 0, marginLeft: 12 }]}>
                                {t('bornOn')} {patient.birthDate}
                            </Text>
                        </View>
                        <View style={[styles.heroInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Ionicons name="water-outline" size={16} color="#ef4444" />
                            <Text style={[styles.heroInfoText, isRTL && { textAlign: 'right', marginRight: 0, marginLeft: 12 }]}>
                                {patient.bloodGroup}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('personalInfo')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('personalContactDesc')}</Text>

                    <InfoField label={t('lastName')} value={isEditing ? editData.lastName : t(patient.lastName)} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('lastName', text)} />
                    <InfoField label={t('firstName')} value={isEditing ? editData.firstName : t(patient.firstName)} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('firstName', text)} />
                    <InfoField label={t('birthDate')} value={isEditing ? editData.birthDate : patient.birthDate} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('birthDate', text)} icon="calendar" />
                    <InfoField label={t('email')} value={isEditing ? editData.email : patient.email} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text)} icon="mail" />
                    <InfoField label={t('phone')} value={isEditing ? editData.phone : patient.phone} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text)} icon="phone" />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfo')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfoDescHeader')}</Text>

                    <InfoField label={t('bloodGroup')} value={isEditing ? editData.bloodGroup : patient.bloodGroup} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('bloodGroup', text)} icon="water-outline" iconType="ionicons" />
                    <InfoField label={t('socialSecurity')} value={isEditing ? editData.socialSecurity : patient.socialSecurity} isEditing={isEditing} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('socialSecurity', text)} icon="shield" />

                    <View style={styles.infoField}>
                        <View style={[styles.rowWithIcon, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="alert-triangle" size={16} color="#ef4444" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                            <Text style={[styles.infoLabel, { marginBottom: 0 }]}>{t('allergies')}</Text>
                        </View>
                        <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                            {(isEditing ? editData.allergies : patient.allergies).map((tag, i) => (
                                <View key={i} style={styles.tagAllergy}>
                                    <Text style={styles.tagAllergyText}>{t(tag)}</Text>
                                    {isEditing && (
                                        <TouchableOpacity onPress={() => handleRemoveTag('allergies', i)} style={styles.removeTagBtn}>
                                            <Text style={styles.removeTagText}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {isEditing && (
                                <TouchableOpacity onPress={() => setActiveModal('allergies')} style={styles.addTagBtn}>
                                    <Feather name="plus" size={16} color="#0f172a" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.infoField}>
                        <View style={[styles.rowWithIcon, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Feather name="file-text" size={16} color="#3b82f6" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                            <Text style={[styles.infoLabel, { marginBottom: 0 }]}>{t('medicalHistory')}</Text>
                        </View>
                        <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                            {(isEditing ? editData.history : patient.history).map((tag, i) => (
                                <View key={i} style={styles.tagHistory}>
                                    <Text style={styles.tagHistoryText}>{t(tag)}</Text>
                                    {isEditing && (
                                        <TouchableOpacity onPress={() => handleRemoveTag('history', i)} style={styles.removeTagBtn}>
                                            <Text style={styles.removeTagTextHistory}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {isEditing && (
                                <TouchableOpacity onPress={() => setActiveModal('history')} style={styles.addTagBtn}>
                                    <Feather name="plus" size={16} color="#0f172a" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContact')}</Text>
                    <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContactDescHeader')}</Text>

                    <InfoField
                        label={t('fullName')}
                        value={isEditing ? editData.emergencyContact.name : patient.emergencyContact.name}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('name', text, 'emergencyContact')}
                    />
                    <InfoField
                        label={t('relation')}
                        value={isEditing ? editData.emergencyContact.relation : t(patient.emergencyContact.relation)}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('relation', text, 'emergencyContact')}
                    />
                    <InfoField
                        label={t('phone')}
                        value={isEditing ? editData.emergencyContact.phone : patient.emergencyContact.phone}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('phone', text, 'emergencyContact')}
                        icon="phone"
                    />
                    <InfoField
                        label={t('email')}
                        value={isEditing ? editData.emergencyContact.email : patient.emergencyContact.email}
                        isEditing={isEditing}
                        isRTL={isRTL}
                        t={t}
                        onChangeText={(text) => handleInputChange('email', text, 'emergencyContact')}
                        icon="mail"
                    />
                </View>

                {isEditing && (
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
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
                                <TouchableOpacity key={bg} style={styles.bloodOption} onPress={() => { if (isEditing) { setEditData(prev => ({ ...prev, bloodGroup: bg })); } else setBloodModalVisible(false); }}>
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
            </Modal>        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    mainHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#f8fafc',
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerMainTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
    },
    headerMainSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    modifyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
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
        backgroundColor: '#2563eb',
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
        marginLeft: 12,
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
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
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
    rowWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
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
        backgroundColor: '#e2e8f0',
        padding: 6,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
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
        color: '#0f172a',
        fontWeight: '600',
    },
    actions: {
        marginTop: 10,
        marginBottom: 40,
    },
    saveBtn: {
        backgroundColor: '#0f172a',
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
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 20,
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
        backgroundColor: '#2563eb',
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
        backgroundColor: theme.colors.background,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    appHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
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
});

export default Profile;
