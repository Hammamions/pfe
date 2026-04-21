import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from './utils/storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';

const { width } = Dimensions.get('window');

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇹🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

const Login = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { syncAllData } = useApp();
    const [activeTab, setActiveTab] = useState('connexion');
    const [langOpen, setLangOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        confirmPassword: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    let emailInputRef = null;
    let passwordInputRef = null;

    const isRTL = i18n.language === 'ar';
    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const loadSavedEmail = async () => {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            if (savedEmail) {
                setFormData(prev => ({ ...prev, email: savedEmail }));
                setRememberMe(true);
            }
        };
        loadSavedEmail();
    }, []);

    const API_URL = (() => {
        const hostUri =
            Constants.expoConfig?.hostUri ||
            Constants.manifest2?.extra?.expoGo?.debuggerHost ||
            '';
        const host = hostUri.split(':')[0];
        return host ? `http://${host}:4000` : 'http://localhost:4000';
    })();

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    };

    const validatePassword = (pass) => {
        const hasLetter = /[a-zA-Z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        return pass.length >= 8 && hasLetter && hasNumber;
    };

    const handleLogin = async () => {
        const errors = {};
        if (!formData.email.trim()) errors.email = t('fillAllFields');
        if (!formData.password.trim()) errors.password = t('fillAllFields');

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.error === 'Email non trouvé') {
                    setFormErrors({ email: data.error });
                } else if (data.error === 'Mot de passe incorrect') {
                    setFormErrors({ password: data.error });
                } else if (data.error === 'Email ou mot de passe incorrect') {
                    setFormErrors({ email: ' ', password: data.error });
                } else {
                    setFormErrors({ email: data.error || t('loginFailed'), password: ' ' });
                }
                return;
            }

            if (rememberMe) {
                await AsyncStorage.setItem('savedEmail', formData.email);
            } else {
                await AsyncStorage.removeItem('savedEmail');
            }
            await AsyncStorage.setItem('token', data.token);
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('patient', JSON.stringify(data.user));

            if (data.token) await syncAllData(data.token);
            router.replace('/dashboard');
        } catch (e) {
            Alert.alert(t('error'), 'Impossible de se connecter au serveur.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const errors = {};
        if (!formData.fullName.trim()) errors.fullName = t('fillAllFields');
        if (!formData.email.trim()) errors.email = t('fillAllFields');
        if (!formData.password.trim()) errors.password = t('fillAllFields');

        if (!errors.email && !validateEmail(formData.email)) {
            errors.email = t('invalidEmail');
        }

        if (!errors.password && !validatePassword(formData.password)) {
            errors.password = "Le mot de passe doit contenir au moins 8 caractères, incluant des lettres et des chiffres.";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});


        try {
            console.log('[DEBUG] Navigating to complete-profile...');
            router.push({
                pathname: '/complete-profile',
                params: {
                    registrationData: JSON.stringify({
                        email: formData.email.trim(),
                        password: formData.password,
                        fullName: formData.fullName.trim()
                    })
                }
            });
        } catch (e) {
            console.error('Navigation error:', e);
            Alert.alert(t('error'), 'Erreur lors de la navigation.');
        }
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
                                    onPress={() => {
                                        setActiveTab('connexion');
                                        setFormErrors({});
                                    }}
                                >
                                    <Text style={[styles.tabText, activeTab === 'connexion' && styles.tabTextActive]}>
                                        {t('tabLogin')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'inscription' && styles.tabActive]}
                                    onPress={() => {
                                        setActiveTab('inscription');
                                        setFormErrors({});
                                    }}
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
                                    <View style={styles.labelRow}>
                                        <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('fullName')}</Text>
                                        <Text style={styles.asterisk}>*</Text>
                                    </View>
                                    <TextInput
                                        style={[styles.input, isRTL && { textAlign: 'right' }, formErrors.fullName && styles.inputError]}
                                        placeholder={t('fullNamePlaceholder')}
                                        placeholderTextColor="#94a3b8"
                                        value={formData.fullName}
                                        onChangeText={(v) => {
                                            setFormData({ ...formData, fullName: v });
                                            if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: null });
                                        }}
                                        returnKeyType="next"
                                        onSubmitEditing={() => emailInputRef?.focus()}
                                    />
                                    {formErrors.fullName && <Text style={styles.errorText}>{formErrors.fullName}</Text>}
                                </View>
                            )}

                            <View style={[styles.formGroup, { zIndex: 2 }]}>
                                <View style={styles.labelRow}>
                                    <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('email')}</Text>
                                    <Text style={styles.asterisk}>*</Text>
                                </View>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }, formErrors.email && styles.inputError]}
                                    placeholder={t('emailPlaceholder')}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={formData.email}
                                    onChangeText={(v) => {
                                        setFormData({ ...formData, email: v });
                                        if (formErrors.email || formErrors.password) setFormErrors({});
                                    }}
                                    autoComplete="off"
                                    textContentType="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordInputRef?.focus()}
                                    ref={(ref) => (emailInputRef = ref)}
                                />
                                {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('password')}</Text>
                                    <Text style={styles.asterisk}>*</Text>
                                </View>
                                <View style={[styles.passwordContainer, formErrors.password && styles.inputError]}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0 }, isRTL && { textAlign: 'right' }]}
                                        placeholder={t('passwordPlaceholder')}
                                        placeholderTextColor="#94a3b8"
                                        secureTextEntry={!showPassword}
                                        value={formData.password}
                                        onChangeText={(v) => {
                                            setFormData({ ...formData, password: v });
                                            if (formErrors.email || formErrors.password) setFormErrors({});
                                        }}
                                        autoComplete="off"
                                        textContentType="none"
                                        returnKeyType="done"
                                        onSubmitEditing={activeTab === 'connexion' ? handleLogin : handleRegister}
                                        ref={(ref) => (passwordInputRef = ref)}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-outline" : "eye-off-outline"}
                                            size={20}
                                            color="#94a3b8"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
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
                                style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                                onPress={activeTab === 'connexion' ? handleLogin : handleRegister}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {activeTab === 'connexion' ? t('loginButton') : t('registerButton')}
                                    </Text>
                                )}
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
        marginBottom: 0,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 4,
    },
    asterisk: {
        color: '#ef4444',
        fontWeight: 'bold',
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        paddingRight: 10,
    },
    eyeButton: {
        padding: 10,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
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
