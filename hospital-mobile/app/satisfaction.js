import { Feather } from '@expo/vector-icons';
import AsyncStorage from './utils/storage';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { patientPastel, theme } from '../theme';
import ColorMoodRating from './components/ColorMoodRating';
import HeaderSidebar from './components/HeaderSidebar';

const Satisfaction = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const API_URL = (() => {
        const hostUri =
            Constants.expoConfig?.hostUri ||
            Constants.manifest2?.extra?.expoGo?.debuggerHost ||
            '';
        const host = hostUri.split(':')[0];
        return host ? `http://${host}:4000` : 'http://localhost:4000';
    })();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            if (Platform.OS === 'web') window.alert(t('ratingPickRequired'));
            else Alert.alert(t('error'), t('ratingPickRequired'));
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    note: rating,
                    commentaire: comment
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to submit');
            }

            setShowSuccessModal(true);
            setRating(0);
            setComment('');
        } catch (error) {
            console.error('Feedback submission error:', error);
            const msg = isRTL ? 'فشل إرسال رأيك' : 'Impossible d\'envoyer votre avis';
            const errorDetail = ` (${error.message})`;
            if (Platform.OS === 'web') window.alert(msg + errorDetail);
            else Alert.alert(t('error'), msg + errorDetail);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <HeaderSidebar activeScreen="satisfaction" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerHero}>
                        <View style={styles.iconCircle}>
                            <Feather name="heart" size={32} color="#fff" />
                        </View>
                        <Text style={styles.heroTitle}>{t('satisfactionTitle')}</Text>
                        <Text style={styles.heroSubtitle}>{t('satisfactionSubtitle')}</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
                            {t('howWasExperience')}
                        </Text>
                        <Text style={[styles.instructionText, isRTL && { textAlign: 'right' }]}>
                            {t('ratingInstructions')}
                        </Text>

                        <ColorMoodRating value={rating} onChange={setRating} isRTL={isRTL} t={t} />

                        <View style={styles.divider} />

                        <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>
                            {t('shareComments')}
                        </Text>
                        <TextInput
                            style={[styles.textArea, isRTL && { textAlign: 'right' }]}
                            placeholder={t('commentPlaceholder')}
                            multiline
                            numberOfLines={6}
                            value={comment}
                            onChangeText={setComment}
                            placeholderTextColor="#94a3b8"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, (rating === 0 || isSubmitting) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>{t('submitFeedback')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconBox}>
                            <Feather name="check" size={40} color="#fff" />
                        </View>
                        <Text style={styles.modalTitle}>{t('feedbackSuccess')}</Text>
                        <Text style={styles.modalDesc}>{t('feedbackSuccessDesc')}</Text>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => {
                                setShowSuccessModal(false);
                            }}
                        >
                            <Text style={styles.modalCloseBtnText}>{t('back')}</Text>
                        </TouchableOpacity>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    headerHero: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: patientPastel.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        ...theme.shadows.md,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: patientPastel.textHeading,
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 25,
        ...theme.shadows.lg,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: patientPastel.textHeading,
        marginBottom: 5,
    },
    instructionText: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 25,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 30,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 12,
    },
    textArea: {
        backgroundColor: patientPastel.pageBg,
        borderRadius: 20,
        padding: 20,
        fontSize: 16,
        color: '#1e293b',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minHeight: 150,
        textAlignVertical: 'top',
        marginBottom: 25,
    },
    submitBtn: {
        backgroundColor: patientPastel.primaryDeep,
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.md,
    },
    submitBtnDisabled: {
        backgroundColor: '#94a3b8',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '85%',
        borderRadius: 35,
        padding: 40,
        alignItems: 'center',
    },
    successIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        ...theme.shadows.md,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: patientPastel.textHeading,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    modalCloseBtn: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 16,
    },
    modalCloseBtnText: {
        color: '#475569',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default Satisfaction;
