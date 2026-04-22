import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { authCardShadow, authTheme, dashboardVibe, patientPastel, screenPastelGradient } from '../theme';
import { useApp } from './AppContext';

const FORGOT_TIMEOUT_MS = 25_000;

const ForgotPassword = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { API_URL } = useApp();
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const isRTL = i18n.language === 'ar';

    const handleSubmit = async () => {
        if (!email) return;
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FORGOT_TIMEOUT_MS);
        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            let data = {};
            try {
                data = await res.json();
            } catch {
                data = {};
            }
            if (res.ok) {
                setSubmitted(true);
            } else {
                Alert.alert(t('error'), data.error || 'Erreur lors de la récupération');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const msg =
                error?.name === 'AbortError'
                    ? `Délai dépassé (${FORGOT_TIMEOUT_MS / 1000}s). Vérifiez le Wi‑Fi et que le backend tourne sur le même réseau que l’app (API: ${API_URL}).`
                    : 'Impossible de contacter le serveur';
            Alert.alert(t('error'), msg);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const backLink = (
        <TouchableOpacity style={styles.backInCard} onPress={() => router.push('/')} hitSlop={12}>
            <Text style={styles.backInCardText}>
                {isRTL ? '→' : '←'} {t('backToLogin')}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.screen}>
            <LinearGradient colors={screenPastelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safe}>
                <Stack.Screen options={{ headerShown: false }} />
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={[styles.brandTop, isRTL && { textAlign: 'right' }]}>{t('brand')}</Text>

                        {!submitted ? (
                            <View style={[styles.card, { borderColor: patientPastel.borderCard }]}>
                                <Text style={styles.title}>{t('accountRecovery')}</Text>
                                <Text style={styles.subtitle}>{t('recoveryDesc')}</Text>

                                <Text style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('insuranceEmail')}</Text>
                                <View style={[styles.inputShell, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <TextInput
                                        style={[styles.input, isRTL && { textAlign: 'right' }]}
                                        placeholder={t('emailInsurancePlaceholder')}
                                        placeholderTextColor="#9ca3af"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        textContentType="emailAddress"
                                        returnKeyType="send"
                                        onSubmitEditing={handleSubmit}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.9}
                                    style={{ borderRadius: 999, overflow: 'hidden', marginBottom: 22 }}
                                >
                                    <LinearGradient
                                        colors={dashboardVibe.primaryCtaGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.primaryGradient, loading && { opacity: 0.75 }]}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <View style={[styles.primaryBtnInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                                <Text style={styles.primaryBtnText}>{t('sendRecoveryLink')}</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                {backLink}
                            </View>
                        ) : (
                            <View style={[styles.card, { borderColor: patientPastel.borderCard }]}>
                                <Text style={styles.title}>{t('checkEmail')}</Text>
                                <Text style={styles.subtitle}>
                                    {t('resetLinkSent')}{' '}
                                    <Text style={styles.emailStrong}>{email}</Text>
                                </Text>
                                <Text style={[styles.hintMuted, isRTL && { textAlign: 'right' }]}>{t('resetEmailServerHint')}</Text>

                                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSubmitted(false)} activeOpacity={0.88}>
                                    <Text style={styles.secondaryBtnText}>{t('resendEmail')}</Text>
                                </TouchableOpacity>

                                {backLink}
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: authTheme.screenBg,
    },
    safe: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 32,
        justifyContent: 'center',
    },
    brandTop: {
        fontSize: 26,
        fontWeight: '900',
        color: authTheme.navy,
        letterSpacing: -0.5,
        marginBottom: 28,
        textAlign: 'center',
    },
    card: {
        backgroundColor: authTheme.cardBg,
        borderRadius: 28,
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: authTheme.cardBorder,
        ...authCardShadow,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: authTheme.textDark,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: authTheme.textMuted,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 26,
        paddingHorizontal: 4,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: authTheme.navy,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    inputShell: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: patientPastel.inputBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: patientPastel.borderInput,
        marginBottom: 22,
        minHeight: 52,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: authTheme.textDark,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    primaryGradient: {
        paddingVertical: 16,
        paddingHorizontal: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    backInCard: {
        alignSelf: 'center',
        paddingVertical: 6,
    },
    backInCardText: {
        color: authTheme.blue,
        fontSize: 15,
        fontWeight: '700',
    },
    emailStrong: {
        fontWeight: '800',
        color: authTheme.textDark,
    },
    hintMuted: {
        fontSize: 13,
        color: authTheme.textMuted,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 20,
    },
    secondaryBtn: {
        paddingVertical: 14,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: authTheme.inputBorder,
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.65)',
    },
    secondaryBtnText: {
        color: authTheme.navy,
        fontSize: 15,
        fontWeight: '700',
    },
});

export default ForgotPassword;
