import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from './utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { dashboardVibe, patientPastel, screenPastelGradient, theme } from '../theme';
import { useApp } from './AppContext';
import { getApiBaseUrl } from './utils/apiBase';
import CustomCalendar from './components/CustomCalendar';

const InfoField = ({ label, value, isRTL, t, keyboardType, onChangeText, required = false, error = false, editable = true }) => (
    <View style={styles.infoField}>
        <View style={styles.labelRow}>
            <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
            {required && <Text style={{ color: '#ef4444', marginLeft: 4, fontWeight: 'bold' }}>*</Text>}
        </View>
        <View style={[
            styles.inputWrapper,
            isRTL && { flexDirection: 'row-reverse' },
            error && { borderColor: '#ef4444', borderBottomWidth: 2 }
        ]}>
            <TextInput
                style={[styles.input, isRTL && { textAlign: 'right' }, { flex: 1 }]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                placeholder=""
                editable={editable}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCorrect={false}
            />
        </View>
        {error && <Text style={[styles.errorText, isRTL && { textAlign: 'right' }]}>{error}</Text>}
    </View>
);

const CompleteProfile = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t, i18n } = useTranslation();
    const { patient, setPatient, syncAllData } = useApp();
    const isRTL = i18n.language === 'ar';
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

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

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    };

    const validatePhone = (phone) => {
        return String(phone).match(/^\d{8}$/);
    };

    const validateDate = (date) => {
        return String(date).match(/^\d{4}-\d{2}-\d{2}$/) || String(date).match(/^\d{2}\/\d{2}\/\d{4}$/);
    };

    useEffect(() => {
        const loadUserData = async () => {
            try {
                let prefilledData = {};

                if (params.registrationData) {
                    try {
                        const parsed = typeof params.registrationData === 'string'
                            ? JSON.parse(params.registrationData)
                            : params.registrationData;

                        if (parsed.email) prefilledData.email = parsed.email;
                        if (parsed.fullName) {
                            const nameParts = parsed.fullName.trim().split(' ');
                            prefilledData.firstName = nameParts[0] || '';
                            prefilledData.lastName = nameParts.slice(1).join(' ') || '';
                        }
                    } catch (e) {
                        console.error('Failed to parse registrationData in useEffect', e);
                    }
                }

                const userJson = await AsyncStorage.getItem('user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    prefilledData = {
                        ...prefilledData,
                        email: prefilledData.email || user.email || ''
                    };
                }

                if (Object.keys(prefilledData).length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        ...prefilledData
                    }));
                }
            } catch (e) {
                console.warn('Failed to load user data for pre-fill', e);
            }
        };
        loadUserData();
    }, [params.registrationData]);

    const [activeModal, setActiveModal] = useState(null);
    const [showBloodModal, setShowBloodModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [newTagValue, setNewTagValue] = useState('');

    const handleInputChange = (field, value, section = null) => {
        if (section) {
            setFormData({
                ...formData,
                [section]: { ...formData[section], [field]: value }
            });
            const errorKey = section === 'emergencyContact'
                ? `emergency${field.charAt(0).toUpperCase()}${field.slice(1)}`
                : field;
            if (errors[errorKey]) {
                const newErrors = { ...errors };
                delete newErrors[errorKey];
                setErrors(newErrors);
            }
        } else {
            setFormData({ ...formData, [field]: value });
            if (errors[field]) {
                const newErrors = { ...errors };
                delete newErrors[field];
                setErrors(newErrors);
            }
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

    const handleComplete = async () => {
        const newErrors = {};
        if (!formData.lastName?.trim()) newErrors.lastName = t('fieldRequired');
        if (!formData.firstName?.trim()) newErrors.firstName = t('fieldRequired');
        if (!formData.birthDate?.trim()) newErrors.birthDate = t('fieldRequired');
        if (!formData.email?.trim()) newErrors.email = t('fieldRequired');
        else if (!validateEmail(formData.email.trim())) newErrors.email = t('invalidEmail');

        if (!formData.phone?.trim()) newErrors.phone = t('fieldRequired');
        else if (!validatePhone(formData.phone.trim())) newErrors.phone = t('invalidPhone');

        if (!formData.bloodGroup?.trim()) newErrors.bloodGroup = t('fieldRequired');
        if (!formData.socialSecurity?.trim()) newErrors.socialSecurity = t('fieldRequired');

        const ec = formData.emergencyContact;
        if (!ec.name?.trim()) newErrors.emergencyName = t('fieldRequired');
        if (!ec.relation?.trim()) newErrors.emergencyRelation = t('fieldRequired');

        if (!ec.phone?.trim()) {
            newErrors.emergencyPhone = t('fieldRequired');
        } else if (!validatePhone(ec.phone.trim())) {
            newErrors.emergencyPhone = t('invalidPhone');
        }

        if (!ec.email?.trim()) {
            newErrors.emergencyEmail = t('fieldRequired');
        } else if (!validateEmail(ec.email.trim())) {
            newErrors.emergencyEmail = t('invalidEmail');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            console.log('[DEBUG] Validation failed:', newErrors);
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        setLoading(true);
        try {
            let parsedRegistrationData = params.registrationData;
            if (typeof params.registrationData === 'string') {
                try {
                    parsedRegistrationData = JSON.parse(params.registrationData);
                } catch (e) {
                    console.error('Failed to parse registrationData', e);
                }
            }

            if (parsedRegistrationData) {
                console.log('[DEBUG] Calling API: POST /api/auth/register-full');
                const res = await fetch(`${getApiBaseUrl()}/api/auth/register-full`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userData: parsedRegistrationData,
                        profileData: formData
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Erreur lors de la création du compte.');
                }

                const data = await res.json();
                console.log('[DEBUG] Full Register Response:', JSON.stringify(data, null, 2));

                const mergedPatient = {
                    ...data.user,
                    ...formData,
                    phone: formData.phone,
                    emergencyContact: { ...formData.emergencyContact },
                    allergies: [...(formData.allergies || [])],
                    history: [...(formData.history || [])]
                };

                await AsyncStorage.setItem('token', data.token);
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('patient', JSON.stringify(mergedPatient));

                setPatient(mergedPatient);
                syncAllData(data.token);

                Alert.alert(t('success'), t('profileUpdated'));
                router.replace('/dashboard');
            } else {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    Alert.alert(t('error'), 'Session expirée. Veuillez vous reconnecter.');
                    router.replace('/login');
                    return;
                }

                console.log('[DEBUG] Calling API: PUT /api/auth/profile');
                const res = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Erreur lors de la sauvegarde du profil.');
                }

                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('patient', JSON.stringify({ ...patient, ...formData }));

                setPatient({ ...patient, ...formData });
                router.replace('/dashboard');
            }
        } catch (error) {
            console.error('Operation error:', error);
            Alert.alert(t('error'), error.message || 'Impossible de contacter le serveur. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <LinearGradient colors={screenPastelGradient} style={styles.container}>
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

                            <InfoField label={t('lastName')} value={formData.lastName} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('lastName', text)} required error={errors.lastName} />
                            <InfoField label={t('firstName')} value={formData.firstName} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('firstName', text)} required error={errors.firstName} />
                            <TouchableOpacity onPress={() => setShowDateModal(true)}>
                                <InfoField label={t('birthDate')} value={formData.birthDate} isRTL={isRTL} t={t} required error={errors.birthDate} editable={false} />
                            </TouchableOpacity>
                            <InfoField label={t('email')} value={formData.email} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text)} keyboardType="email-address" required error={errors.email} />
                            <InfoField label={t('phone')} value={formData.phone} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text)} keyboardType="phone-pad" required error={errors.phone} />
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('medicalInfo')}</Text>

                            <TouchableOpacity onPress={() => setShowBloodModal(true)}>
                                <InfoField label={t('bloodGroup')} value={formData.bloodGroup} isRTL={isRTL} t={t} required error={errors.bloodGroup} editable={false} />
                            </TouchableOpacity>
                            <InfoField label={t('socialSecurity')} value={formData.socialSecurity} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('socialSecurity', text)} keyboardType="numeric" required error={errors.socialSecurity} />

                            <View style={styles.infoField}>
                                <Text style={[styles.infoLabel, { marginBottom: 10 }, isRTL && { textAlign: 'right' }]}>{t('allergies')}</Text>
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
                                        <Text style={styles.addTagBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.infoField}>
                                <Text style={[styles.infoLabel, { marginBottom: 10 }, isRTL && { textAlign: 'right' }]}>{t('medicalHistory')}</Text>
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
                                        <Text style={styles.addTagBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('emergencyContact')}</Text>

                            <InfoField label={t('fullName')} value={formData.emergencyContact.name} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('name', text, 'emergencyContact')} required error={errors.emergencyName} />
                            <InfoField label={t('relation')} value={formData.emergencyContact.relation} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('relation', text, 'emergencyContact')} required error={errors.emergencyRelation} />
                            <InfoField label={t('phone')} value={formData.emergencyContact.phone} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('phone', text, 'emergencyContact')} keyboardType="phone-pad" required error={errors.emergencyPhone} />
                            <InfoField label={t('email')} value={formData.emergencyContact.email} isRTL={isRTL} t={t} onChangeText={(text) => handleInputChange('email', text, 'emergencyContact')} keyboardType="email-address" required error={errors.emergencyEmail} />
                        </View>

                        <TouchableOpacity
                            onPress={handleComplete}
                            disabled={loading}
                            activeOpacity={0.9}
                            style={{ borderRadius: 100, overflow: 'hidden', marginTop: 10, marginBottom: 20 }}
                        >
                            <LinearGradient
                                colors={dashboardVibe.primaryCtaGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.saveBtnGradient, loading && { opacity: 0.7 }]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>{t('finishRegistration')}</Text>
                                )}
                            </LinearGradient>
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

                <Modal transparent visible={showBloodModal} animationType="fade" onRequestClose={() => setShowBloodModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('bloodGroup')}</Text>
                            <View style={styles.bloodOptions}>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                    <TouchableOpacity key={bg} style={styles.bloodOption} onPress={() => { handleInputChange('bloodGroup', bg); setShowBloodModal(false); }}>
                                        <Text style={styles.bloodOptionText}>{bg}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowBloodModal(false)}>
                                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <CustomCalendar
                    visible={showDateModal}
                    onClose={() => setShowDateModal(false)}
                    onSelect={(date) => {
                        handleInputChange('birthDate', date);
                        setShowDateModal(false);
                    }}
                    initialDate={formData.birthDate}
                    isRTL={isRTL}
                    t={t}
                />

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
        color: patientPastel.textHeading,
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
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    saveBtnGradient: {
        paddingVertical: 18,
        alignItems: 'center',
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
        color: patientPastel.textHeading,
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
        backgroundColor: patientPastel.inputBg,
        borderWidth: 1,
        borderColor: patientPastel.borderInput,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: patientPastel.textHeading,
        marginBottom: 20,
        outlineStyle: 'none',
    },
    modalSaveBtn: {
        backgroundColor: patientPastel.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalSaveBtnDisabled: {
        backgroundColor: '#94a3b8',
    },
    bloodOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 10,
    },
    bloodOption: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 60,
        alignItems: 'center',
    },
    bloodOptionText: {
        color: '#1e293b',
        fontWeight: '700',
        fontSize: 16,
    },
    modalCancelText: {
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 10,
    },
    datePickerContainer: {
        alignItems: 'center',
        width: '100%',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
});

export default CompleteProfile;
