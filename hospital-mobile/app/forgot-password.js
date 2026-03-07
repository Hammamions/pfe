import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

const ForgotPassword = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const isRTL = i18n.language === 'ar';

    const handleSubmit = () => {
        if (!email) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    return (
        <LinearGradient
            colors={['#eff6ff', '#dbeafe', '#eff6ff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.brandName}>{t('brand')}</Text>
                        <Text style={styles.tagline}>{t('taglineAlt')}</Text>
                    </View>

                    {!submitted ? (
                        <View style={styles.card}>
                            <Text style={[styles.title, isRTL && { textAlign: 'right' }]}>{t('accountRecovery')}</Text>
                            <Text style={[styles.subtitle, isRTL && { textAlign: 'right' }]}>{t('recoveryDesc')}</Text>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('insuranceEmail')}</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder={t('emailPlaceholder')}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="send"
                                    onSubmitEditing={handleSubmit}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>{t('sendRecoveryLink')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.titleCenter}>{t('checkEmail')}</Text>
                            <Text style={styles.subtitleCenter}>
                                {t('resetLinkSent')} <Text style={{ fontWeight: '700', color: theme.colors.dark }}>{email}</Text>
                            </Text>

                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSubmitted(false)}>
                                <Text style={styles.secondaryBtnText}>{t('resendEmail')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
                        <Text style={styles.backBtnText}>{isRTL ? '→' : '←'} {t('backToLogin')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoWrapper: {
        width: 80,
        height: 80,
        marginBottom: 12,
    },
    logoImage: {
        width: 80,
        height: 80,
    },
    brandName: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.dark,
    },
    tagline: {
        fontSize: 14,
        color: theme.colors.textMuted,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 25,
        ...theme.shadows.md,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        lineHeight: 20,
        marginBottom: 25,
    },
    titleCenter: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitleCenter: {
        fontSize: 14,
        color: theme.colors.textMuted,
        lineHeight: 20,
        marginBottom: 25,
        textAlign: 'center',
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
        borderRadius: 14,
        padding: 15,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    primaryBtn: {
        backgroundColor: theme.colors.dark,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    successIconBox: {
        alignItems: 'center',
        marginBottom: 20,
    },
    secondaryBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: theme.colors.textMain,
        fontSize: 15,
        fontWeight: '600',
    },
    backBtn: {
        marginTop: 30,
        alignItems: 'center',
    },
    backBtnText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default ForgotPassword;
