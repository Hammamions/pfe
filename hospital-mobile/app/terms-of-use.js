import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

const TermsOfUse = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const sections = [
        { title: t('termsAcceptTitle'), text: t('termsAcceptText') },
        { title: t('termsServiceTitle'), text: t('termsServiceText') },
        { title: t('termsDataTitle'), text: t('termsDataText') },
        { title: t('termsUserTitle'), text: t('termsUserText') },
        { title: t('termsLimitTitle'), text: t('termsLimitText') },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: t('termsTitle'), headerTransparent: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.title}>{t('termsTitle')}</Text>
                    <Text style={styles.updateText}>{t('lastUpdate')} 01/01/2026</Text>

                    <View style={styles.divider} />

                    {sections.map((section, idx) => (
                        <View key={idx} style={styles.section}>
                            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{section.title}</Text>
                            <Text style={[styles.sectionText, isRTL && { textAlign: 'right' }]}>{section.text}</Text>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.acceptBtn} onPress={() => router.push('/')}>
                        <Text style={styles.acceptBtnText}>{t('iAccept')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 25,
        ...theme.shadows.md,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.dark,
        textAlign: 'center',
        marginBottom: 8,
    },
    updateText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: 25,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 10,
    },
    sectionText: {
        fontSize: 14,
        color: theme.colors.textMuted,
        lineHeight: 22,
        fontWeight: '500',
    },
    acceptBtn: {
        backgroundColor: theme.colors.dark,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        ...theme.shadows.sm,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default TermsOfUse;
