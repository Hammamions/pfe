import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { patientPastel, theme } from '../theme';
import { useApp } from './AppContext';
import ColorMoodRating from './components/ColorMoodRating';
import HeaderSidebar from './components/HeaderSidebar';
import AsyncStorage from './utils/storage';

export default function Feedback() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { API_URL } = useApp();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    const loadFeedbacks = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const response = await fetch(`${API_URL}/api/feedback`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return;
            const data = await response.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.warn('[FEEDBACK] Error loading feedbacks:', e);
        }
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    const submitFeedback = async () => {
        if (!rating) {
            Alert.alert(t('error'), t('ratingPickRequired'));
            return;
        }
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const payload = { note: rating, commentaire: comment.trim() };

            if (!token) {
                Alert.alert(t('error'), "Session expirée. Veuillez vous reconnecter.");
                return;
            }

            const response = await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                Alert.alert(t('error'), data.error || t('feedbackError'));
                return;
            }
            setItems((prev) => [data, ...prev]);
            setRating(0);
            setComment('');
            Alert.alert(t('feedbackSentTitle'), t('feedbackSentSubtitle'));
        } catch (e) {
            console.warn('[FEEDBACK] Error submitting feedback:', e);
            Alert.alert(t('error'), t('feedbackError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <HeaderSidebar activeScreen="feedback" />

            <View style={styles.header}>
                <Text style={styles.title}>{t('feedbackTitle')}</Text>
                <Text style={styles.subtitle}>{t('feedbackSubtitle')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.label}>{t('ratingInstructions')}</Text>
                    <ColorMoodRating value={rating} onChange={setRating} isRTL={isRTL} t={t} />

                    <Text style={styles.label}>{t('feedbackComment')}</Text>
                    <TextInput
                        style={styles.textArea}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={5}
                        placeholder={t('feedbackPlaceholder')}
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={submitFeedback}
                        disabled={loading}
                    >
                        <Text style={styles.submitText}>{loading ? t('sending') : t('feedbackSend')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.historyTitle}>{t('feedbackHistory')}</Text>
                    {items.length === 0 ? (
                        <Text style={styles.emptyText}>{t('feedbackEmpty')}</Text>
                    ) : (
                        items.map((item) => (
                            <View key={item.id} style={styles.feedbackItem}>
                                <Text style={styles.feedbackNote}>{t('feedbackScore')}: {item.note}/5</Text>
                                <Text style={styles.feedbackComment}>{item.commentaire || '-'}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: patientPastel.pageBg },
    header: { paddingHorizontal: 20, paddingVertical: 14 },
    title: { fontSize: 28, fontWeight: '900', color: patientPastel.textHeading },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    content: { padding: 20, paddingTop: 0 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    label: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
    textArea: {
        backgroundColor: patientPastel.pageBg,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        textAlignVertical: 'top',
        minHeight: 120,
        marginBottom: 14
    },
    submitBtn: {
        backgroundColor: theme.colors.dark,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center'
    },
    submitText: { color: '#fff', fontWeight: '700' },
    historyTitle: { fontSize: 16, fontWeight: '800', color: patientPastel.textHeading, marginBottom: 10 },
    emptyText: { color: '#64748b' },
    feedbackItem: {
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10
    },
    feedbackNote: { fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    feedbackComment: { color: '#475569' }
});
