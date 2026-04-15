import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';

const InfoField = ({ label, value, icon, iconType = 'feather', isRTL, t, keyboardType, onChangeText }) => (
    <View style={styles.infoField}>
        <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
        <View style={[styles.inputWrapper, isRTL && { flexDirection: 'row-reverse' }]}>
            {icon && (
                iconType === 'feather' ?
                    <Feather name={icon} size={18} color="#94a3b8" style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} /> :
                    <Ionicons name={icon} size={18} color="#94a3b8" style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
            )}
            <TextInput
                style={[styles.input, isRTL && { textAlign: 'right' }, { flex: 1 }]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
            />
        </View>
    </View>
);

const CompleteProfile = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { patient, setPatient } = useApp();
    const isRTL = i18n.language === 'ar';

    const [formData, setFormData] = useState({
        lastName: '',
        firstName: '',
        birthDate: '',
        email: '',
        phone: '',
        bloodGroup: '',
        socialSecurity: '',
        allergies: [],
        history: [],
        emergencyContact: {
            name: '',
            relation: '',
            phone: '',
            email: ''
        }
    });

    const [activeModal, setActiveModal] = useState(null);
    const [newTagValue, setNewTagValue] = useState('');

    const handleInputChange = (field, value, section = null) => {
        if (section) {
            setFormData({
                ...formData,
                [section]: { ...formData[section], [field]: value }
            });
        } else {
            setFormData({ ...formData, [field]: value });
        }
    };

    const handleRemoveTag = (section, index) => {
        setFormData({
            ...formData,
            [section]: formData[section].filter((_, i) => i !== index)
        });
    };

    const handleAddTag = () => {
        if (!newTagValue.trim()) return;
        setFormData({
            ...formData,
            [activeModal]: [...(formData[activeModal] || []), newTagValue.trim()]
        });
        setActiveModal(null);
        setNewTagValue('');
    };

    const handleComplete = () => {
        const isEmergencyComplete = formData.emergencyContact.name.trim() &&
            formData.emergencyContact.relation.trim() &&
            formData.emergencyContact.phone.trim() &&
            formData.emergencyContact.email.trim();

        const isMainComplete = formData.lastName.trim() && formData.firstName.trim() &&
            formData.birthDate.trim() && formData.email.trim() &&
            formData.phone.trim() && formData.bloodGroup.trim() &&
            formData.socialSecurity.trim();

        if (!isMainComplete || !isEmergencyComplete) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        setPatient({
            ...patient,
            ...formData,
        });
        router.replace('/dashboard');
    };

    return (
        <LinearGradient
            colors={['#eff6ff', '#dbeafe', '#eff6ff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={{ flex: 1 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.title, isRTL && { textAlign: 'right' }]}>{t('completeProfile')}</Text>
                            <Text style={[styles.subtitle, isRTL && { textAlign: 'right' }]}>{t('completeProfileDesc')}</Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('personalInfo')}</Text>

                            <InfoField label={t('lastName')} value={formData.lastName} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('lastName', text)} />
                            <InfoField label={t('firstName')} value={formData.firstName} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('firstName', text)} />
                            <InfoField label={t('birthDate')} value={formData.birthDate} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('birthDate', text)} icon="calendar" />
                            <InfoField label={t('email')} value={formData.email} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text)} icon="mail" keyboardType="email-address" />
                            <InfoField label={t('phone')} value={formData.phone} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text)} icon="phone" keyboardType="phone-pad" />
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfo')}</Text>

                            <InfoField label={t('bloodGroup')} value={formData.bloodGroup} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('bloodGroup', text)} icon="water-outline" iconType="ionicons" />
                            <InfoField label={t('socialSecurity')} value={formData.socialSecurity} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('socialSecurity', text)} icon="shield" keyboardType="numeric" />

                            <View style={styles.infoField}>
                                <View style={[styles.rowWithIcon, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Feather name="alert-triangle" size={16} color="#ef4444" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                                    <Text style={[styles.infoLabel, { marginBottom: 0 }]}>{t('allergies')}</Text>
                                </View>
                                <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                                    {formData.allergies.map((tag, i) => (
                                        <View key={i} style={styles.tagAllergy}>
                                            <Text style={styles.tagAllergyText}>{t(tag)}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveTag('allergies', i)} style={styles.removeTagBtn}>
                                                <Text style={styles.removeTagText}>×</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <TouchableOpacity onPress={() => setActiveModal('allergies')} style={styles.addTagBtn}>
                                        <Feather name="plus" size={16} color="#0f172a" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.infoField}>
                                <View style={[styles.rowWithIcon, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Feather name="file-text" size={16} color="#3b82f6" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                                    <Text style={[styles.infoLabel, { marginBottom: 0 }]}>{t('medicalHistory')}</Text>
                                </View>
                                <View style={[styles.tagContainer, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10 }]}>
                                    {formData.history.map((tag, i) => (
                                        <View key={i} style={styles.tagHistory}>
                                            <Text style={styles.tagHistoryText}>{t(tag)}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveTag('history', i)} style={styles.removeTagBtn}>
                                                <Text style={styles.removeTagTextHistory}>×</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <TouchableOpacity onPress={() => setActiveModal('history')} style={styles.addTagBtn}>
                                        <Feather name="plus" size={16} color="#0f172a" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContact')}</Text>

                            <InfoField label={t('fullName')} value={formData.emergencyContact.name} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('name', text, 'emergencyContact')} />
                            <InfoField label={t('relation')} value={formData.emergencyContact.relation} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('relation', text, 'emergencyContact')} />
                            <InfoField label={t('phone')} value={formData.emergencyContact.phone} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text, 'emergencyContact')} icon="phone" keyboardType="phone-pad" />
                            <InfoField label={t('email')} value={formData.emergencyContact.email} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text, 'emergencyContact')} icon="mail" keyboardType="email-address" />
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleComplete}>
                            <Text style={styles.saveBtnText}>{t('finishRegistration')}</Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>

                <Modal
                    visible={activeModal !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setActiveModal(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={[styles.modalHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                                <Text style={styles.modalTitle}>
                                    {activeModal === 'allergies' ? t('newAllergy') : t('newHistoryEntry')}
                                </Text>
                                <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.modalDesc, isRTL && { textAlign: 'right' }]}>
                                {activeModal === 'allergies' ? t('addAllergyDesc') : t('addHistoryDesc')}
                            </Text>

                            <TextInput
                                style={[styles.modalInput, isRTL && { textAlign: 'right' }]}
                                placeholder={activeModal === 'allergies' ? t('allergyPlaceholder') : t('historyPlaceholder')}
                                placeholderTextColor="#94a3b8"
                                value={newTagValue}
                                onChangeText={setNewTagValue}
                                autoFocus
                                onSubmitEditing={handleAddTag}
                            />

                            <TouchableOpacity
                                style={[styles.modalSaveBtn, !newTagValue.trim() && styles.modalSaveBtnDisabled]}
                                onPress={handleAddTag}
                                disabled={!newTagValue.trim()}
                            >
                                <Text style={styles.saveBtnText}>{t('add')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
        alignItems: 'center',
    },
    skipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    content: {
        paddingHorizontal: 25,
        paddingTop: 10,
        alignItems: 'stretch',
    },
    headerTextContainer: {
        width: '100%',
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.colors.dark,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textMuted,
        fontWeight: '500',
        lineHeight: 22,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        marginBottom: 20,
        width: '100%',
        ...theme.shadows.sm,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 20,
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
        borderColor: '#e2e8f0',
    },
    input: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
        padding: 0,
        outlineStyle: 'none',
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
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    saveBtn: {
        backgroundColor: '#0f172a',
        paddingVertical: 18,
        borderRadius: 100,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
        ...theme.shadows.sm,
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
        ...theme.shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalDesc: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 20,
        outlineStyle: 'none',
    },
    modalSaveBtn: {
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalSaveBtnDisabled: {
        backgroundColor: '#94a3b8',
    },
});

export default CompleteProfile;
