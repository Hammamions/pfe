import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authCardShadow, authTheme, dashboardVibe, patientPastel, screenPastelGradient } from '../theme';
import { useApp } from './AppContext';

const TermsOfUse = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { logout } = useApp();
    const isRTL = i18n.language === 'ar';

    const handleLogout = useCallback(() => {
        const go = async () => {
            await logout();
            router.replace('/login');
        };
        if (Platform.OS === 'web') {
            void go();
            return;
        }
        Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmMessage'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('logoutConfirmAction'), style: 'destructive', onPress: () => void go() }
        ]);
    }, [logout, router, t]);

    const sections = [
        { title: t('termsAcceptTitle'), text: t('termsAcceptText') },
        { title: t('termsServiceTitle'), text: t('termsServiceText') },
        { title: t('termsDataTitle'), text: t('termsDataText') },
        { title: t('termsUserTitle'), text: t('termsUserText') },
        { title: t('termsLimitTitle'), text: t('termsLimitText') },
    ];

    return (
        <View style={styles.screen}>
            <LinearGradient colors={screenPastelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safe}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={[styles.topBar, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
                        <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={26} color={authTheme.navy} />
                    </TouchableOpacity>
                    <Text style={[styles.topTitle, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                        {t('termsTitle')}
                    </Text>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        accessibilityRole="button"
                        accessibilityLabel={t('navLogout')}
                    >
                        <Feather name="log-out" size={22} color={authTheme.navy} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { borderColor: patientPastel.borderCard }]}>
                        <Text style={styles.title}>{t('termsTitle')}</Text>
                        <Text style={styles.updateText}>
                            {t('lastUpdate')} 01/01/2026
                        </Text>

                        <View style={styles.divider} />

                        {sections.map((section, idx) => (
                            <View key={idx} style={styles.section}>
                                <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{section.title}</Text>
                                <Text style={[styles.sectionText, isRTL && { textAlign: 'right' }]}>{section.text}</Text>
                            </View>
                        ))}

                        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.9} style={{ borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                            <LinearGradient colors={dashboardVibe.primaryCtaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtn}>
                                <View style={[styles.acceptBtnInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Text style={styles.acceptBtnText}>{t('iAccept')}</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: authTheme.topBarChipBg,
        borderWidth: 1,
        borderColor: authTheme.topBarChipBorder,
    },
    logoutBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: authTheme.topBarChipBg,
        borderWidth: 1,
        borderColor: authTheme.topBarChipBorder,
    },
    topTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: authTheme.navy,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 36,
    },
    card: {
        backgroundColor: authTheme.cardBg,
        borderRadius: 28,
        paddingVertical: 28,
        paddingHorizontal: 22,
        borderWidth: 1,
        borderColor: authTheme.cardBorder,
        ...authCardShadow,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: authTheme.textDark,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    updateText: {
        fontSize: 12,
        color: authTheme.textMuted,
        textAlign: 'center',
        marginBottom: 18,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: authTheme.divider,
        marginBottom: 20,
    },
    section: {
        marginBottom: 22,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: authTheme.navy,
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    sectionText: {
        fontSize: 14,
        color: authTheme.textMuted,
        lineHeight: 22,
        fontWeight: '500',
    },
    acceptBtn: {
        paddingVertical: 16,
        borderRadius: 999,
        alignItems: 'center',
    },
    acceptBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});

export default TermsOfUse;
