import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇹🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

const Login = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('connexion');
    const [langOpen, setLangOpen] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        confirmPassword: '',
    });

    let emailInputRef = null;
    let passwordInputRef = null;

    const isRTL = i18n.language === 'ar';
    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleLogin = () => {
        if (!formData.email.trim() || !formData.password.trim()) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }
        router.replace('/dashboard');
    };

    const handleRegister = () => {
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }
        router.replace('/complete-profile');
    };

    const toggleLanguage = (code) => {
        i18n.changeLanguage(code);
        setLangOpen(false);
    };

    return (
        <LinearGradient
            colors={['#eff6ff', '#dbeafe', '#eff6ff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.langContainer}>
                    <TouchableOpacity
                        style={styles.langButton}
                        onPress={() => setLangOpen(!langOpen)}
                    >
                        <Text style={styles.globeIcon}>🌐</Text>
                        <Text style={styles.langText}>{currentLang.flag} {currentLang.label}</Text>
                        <Text style={styles.chevron}>{langOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {langOpen && (
                        <View style={styles.langDropdown}>
                            {LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.langOption, lang.code === i18n.language && styles.langOptionActive]}
                                    onPress={() => toggleLanguage(lang.code)}
                                >
                                    <Text style={[styles.langOptionText, lang.code === i18n.language && styles.langOptionTextActive]}>
                                        {lang.flag} {lang.label}
                                    </Text>
                                    {lang.code === i18n.language && (
                                        <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.authContainer}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.brandText}>{t('brand')}</Text>
                        <Text style={styles.taglineText}>{t('tagline')}</Text>

                        <View style={styles.tabsOuter}>
                            <View style={[styles.tabsContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'connexion' && styles.tabActive]}
                                    onPress={() => setActiveTab('connexion')}
                                >
                                    <Text style={[styles.tabText, activeTab === 'connexion' && styles.tabTextActive]}>
                                        {t('tabLogin')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'inscription' && styles.tabActive]}
                                    onPress={() => setActiveTab('inscription')}
                                >
                                    <Text style={[styles.tabText, activeTab === 'inscription' && styles.tabTextActive]}>
                                        {t('tabRegister')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={[styles.cardTitle, isRTL && { textAlign: 'right' }]}>
                                {activeTab === 'connexion' ? t('loginTitle') : t('registerTitle')}
                            </Text>
                            <Text style={[styles.cardSubtitle, isRTL && { textAlign: 'right' }]}>
                                {activeTab === 'connexion' ? t('loginSubtitle') : t('registerSubtitle')}
                            </Text>

                            {activeTab === 'inscription' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('fullName')}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && { textAlign: 'right' }]}
                                        placeholder={t('fullNamePlaceholder')}
                                        placeholderTextColor="#94a3b8"
                                        value={formData.fullName}
                                        onChangeText={(v) => setFormData({ ...formData, fullName: v })}
                                        returnKeyType="next"
                                        onSubmitEditing={() => emailInputRef?.focus()}
                                    />
                                </View>
                            )}

                            <View style={[styles.formGroup, { zIndex: 2 }]}>
                                <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('email')}</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder={t('emailPlaceholder')}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={formData.email}
                                    onChangeText={(v) => {
                                        setFormData({ ...formData, email: v });
                                    }}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordInputRef?.focus()}
                                    ref={(ref) => (emailInputRef = ref)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('password')}</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder={t('passwordPlaceholder')}
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry
                                    value={formData.password}
                                    onChangeText={(v) => setFormData({ ...formData, password: v })}
                                    returnKeyType="done"
                                    onSubmitEditing={activeTab === 'connexion' ? handleLogin : handleRegister}
                                    ref={(ref) => (passwordInputRef = ref)}
                                />
                            </View>

                            {activeTab === 'connexion' && (
                                <View style={[styles.rowBetween, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <TouchableOpacity
                                        style={[styles.checkboxContainer, isRTL && { flexDirection: 'row-reverse' }]}
                                        onPress={() => setRememberMe(!rememberMe)}
                                    >
                                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                            {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                                        </View>
                                        <Text style={[styles.rememberText, isRTL && { marginRight: 8, marginLeft: 0 }]}>{t('rememberMe')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                                        <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={activeTab === 'connexion' ? handleLogin : handleRegister}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {activeTab === 'connexion' ? t('loginButton') : t('registerButton')}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                {activeTab === 'connexion' ? (
                                    <>
                                        <Text style={styles.footerText}>{t('termsText')}</Text>
                                        <TouchableOpacity onPress={() => router.push('/terms-of-use')}>
                                            <Text style={styles.footerLink}>{t('termsLink')}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={[{ flexDirection: 'row', justifyContent: 'center' }, isRTL && { flexDirection: 'row-reverse' }]}>
                                        <Text style={styles.footerText}>{t('alreadyRegistered')} </Text>
                                        <TouchableOpacity onPress={() => setActiveTab('connexion')}>
                                            <Text style={styles.forgotText}>{t('loginLink')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        paddingTop: 10,
    },
    langContainer: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 100,
        overflow: 'visible',
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
        ...theme.shadows.sm,
    },
    globeIcon: {
        fontSize: 14,
    },
    langText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textMain,
    },
    chevron: {
        fontSize: 8,
        color: theme.colors.textMuted,
    },
    langDropdown: {
        position: 'absolute',
        top: 42,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 6,
        minWidth: 170,
        zIndex: 200,
        ...theme.shadows.md,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    langOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
    },
    langOptionActive: {
        backgroundColor: '#eff6ff',
    },
    langOptionText: {
        fontSize: 14,
        color: theme.colors.textMain,
    },
    langOptionTextActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    authContainer: {
        paddingHorizontal: 25,
        paddingTop: 55,
        alignItems: 'center',
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
    brandText: {
        fontSize: 26,
        fontWeight: '900',
        color: theme.colors.dark,
        letterSpacing: -0.5,
    },
    taglineText: {
        fontSize: 14,
        color: theme.colors.textMuted,
        fontWeight: '500',
        marginBottom: 25,
    },
    tabsOuter: {
        marginBottom: 25,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 4,
        borderRadius: 100,
    },
    tab: {
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderRadius: 100,
    },
    tabActive: {
        backgroundColor: '#fff',
        ...theme.shadows.sm,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    tabTextActive: {
        color: theme.colors.dark,
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        width: '100%',
        ...theme.shadows.sm,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        marginBottom: 25,
        fontWeight: '500',
    },
    formGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.dark,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.textMain,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 22,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    checkMark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    rememberText: {
        fontSize: 13,
        color: theme.colors.textMain,
        fontWeight: '500',
    },
    forgotText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: theme.colors.dark,
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        marginTop: 22,
    },
    footerText: {
        fontSize: 13,
        color: theme.colors.textMuted,
        textAlign: 'center',
        fontWeight: '500',
    },
    footerLink: {
        fontSize: 13,
        color: theme.colors.dark,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});

export default Login;
