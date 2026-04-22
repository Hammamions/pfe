import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from './utils/storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authCardShadow, authTheme, dashboardVibe, screenPastelGradient } from '../theme';
import { useApp } from './AppContext';
import { getApiBaseUrl } from './utils/apiBase';

const { width: INIT_W } = Dimensions.get('window');

const C_NAVY = authTheme.navy;
const C_TEXT_MUTED = authTheme.textMuted;
const C_INPUT_INNER = authTheme.inputInner;
const C_TEXT_DARK = authTheme.textDark;
const C_BTN_B = authTheme.btnMid;
const C_BTN_C = authTheme.btnDeep;
const C_ICON_GLOBE = authTheme.iconGlobe;

const LOGIN_CARD_BORDER = 'rgba(165, 180, 252, 0.5)';
const LOGIN_INPUT_BORDER = 'rgba(191, 219, 254, 0.95)';

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇹🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

function useResponsiveScale() {
    const { width: winW, fontScale } = useWindowDimensions();
    return useMemo(() => {
        const ratio = Math.min(Math.max(winW / 390, 0.82), 1.22);
        const fsMul = Math.min(fontScale, 1.25);
        const rf = (px) => Math.round(px * ratio * fsMul);
        const rcl = (px) => Math.round(px * ratio);
        return {
            rf,
            rcl,
            winW,
            brand: rf(28),
            tagline: rf(15),
            cardTitle: rf(22),
            cardSub: rf(14),
            tab: rf(14),
            fieldLbl: rf(11),
            input: rf(16),
            btn: rf(16),
            foot: rf(13),
            err: rf(12),
            langCode: rf(15),
            logoImg: rcl(56),
            icon: rcl(20),
            chevron: rcl(16),
        };
    }, [winW, fontScale]);
}

const Login = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { syncAllData } = useApp();
    const insets = useSafeAreaInsets();
    const rs = useResponsiveScale();
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
    const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const loadSavedEmail = async () => {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            if (savedEmail) {
                setFormData((prev) => ({ ...prev, email: savedEmail }));
                setRememberMe(true);
            }
        };
        loadSavedEmail();
    }, []);

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
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
            const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password }),
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
            errors.password = 'Le mot de passe doit contenir au moins 8 caractères, incluant des lettres et des chiffres.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        try {
            router.push({
                pathname: '/complete-profile',
                params: {
                    registrationData: JSON.stringify({
                        email: formData.email.trim(),
                        password: formData.password,
                        fullName: formData.fullName.trim(),
                    }),
                },
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

    const langSide = isRTL ? { left: 16, right: undefined } : { right: 16, left: undefined };
    const langTop = Math.max(insets.top, 8) + 4;
    const langMenuPadTop = langTop + rs.rcl(46);

    return (
        <View style={styles.screen}>
            <LinearGradient colors={screenPastelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
                <Stack.Screen options={{ headerShown: false }} />

                <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
                    <View style={styles.langModalRoot} pointerEvents="box-none">
                        <Pressable style={styles.langModalBackdrop} onPress={() => setLangOpen(false)} />
                        <View
                            style={[
                                styles.langModalStrip,
                                { paddingTop: langMenuPadTop },
                                isRTL ? { alignItems: 'flex-start', paddingLeft: 16 } : { alignItems: 'flex-end', paddingRight: 16 },
                            ]}
                            pointerEvents="box-none"
                        >
                            <View style={styles.langModalCard}>
                                {LANGUAGES.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.code}
                                        style={[styles.langOption, lang.code === i18n.language && styles.langOptionActive]}
                                        onPress={() => toggleLanguage(lang.code)}
                                    >
                                        <Text
                                            style={[
                                                styles.langOptionText,
                                                { fontSize: rs.foot },
                                                lang.code === i18n.language && styles.langOptionTextActive,
                                            ]}
                                        >
                                            {lang.flag} {lang.label}
                                        </Text>
                                        {lang.code === i18n.language ? (
                                            <Text style={{ color: C_BTN_C, fontWeight: '800' }}>✓</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={[styles.langAnchor, langSide, { top: langTop }]} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[styles.langButton, isRTL && { flexDirection: 'row-reverse' }]}
                        onPress={() => setLangOpen(!langOpen)}
                        activeOpacity={0.88}
                    >
                        <Feather name="globe" size={rs.icon} color={C_ICON_GLOBE} />
                        <Text style={[styles.langCodeText, { fontSize: rs.langCode }]}>{currentLang.code.toUpperCase()}</Text>
                        <Feather name={langOpen ? 'chevron-up' : 'chevron-down'} size={rs.chevron} color={C_NAVY} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <Pressable style={styles.flex} onPress={() => langOpen && setLangOpen(false)}>
                        <ScrollView
                            contentContainerStyle={[
                                styles.scrollContent,
                                {
                                    paddingTop: Math.max(insets.top + rs.rcl(18), rs.rcl(36)),
                                },
                            ]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={[styles.authContainer, { maxWidth: rs.winW }]}>
                                <View style={[styles.heroCenter, { paddingHorizontal: rs.rcl(8) }]}>
                                    <View style={styles.logoBlock}>
                                        <Image
                                            source={require('../assets/logo.png')}
                                            style={{ width: rs.logoImg, height: rs.logoImg }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={[styles.brandText, { fontSize: rs.brand, marginBottom: rs.rcl(6) }]}>{t('brand')}</Text>
                                    <Text
                                        style={[
                                            styles.taglineText,
                                            styles.taglinePastel,
                                            {
                                                fontSize: rs.tagline,
                                                marginTop: rs.rcl(2),
                                                marginBottom: rs.rcl(14),
                                            },
                                        ]}
                                    >
                                        {t('tagline')}
                                    </Text>
                                </View>

                                <View style={[styles.tabsOuter, { marginBottom: rs.rcl(18) }]}>
                                    <View style={[styles.tabsContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.tab,
                                                activeTab === 'connexion' && styles.tabActiveLogin,
                                                { paddingVertical: rs.rcl(11) },
                                            ]}
                                            onPress={() => {
                                                setActiveTab('connexion');
                                                setFormErrors({});
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    { fontSize: rs.tab },
                                                    activeTab === 'connexion' && styles.tabTextOnPastel,
                                                ]}
                                            >
                                                {t('tabLogin')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.tab,
                                                activeTab === 'inscription' && styles.tabActiveRegisterBlue,
                                                { paddingVertical: rs.rcl(11) },
                                            ]}
                                            onPress={() => {
                                                setActiveTab('inscription');
                                                setFormErrors({});
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    { fontSize: rs.tab },
                                                    activeTab === 'inscription' && styles.tabTextOnPastel,
                                                ]}
                                            >
                                                {t('tabRegister')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View
                                    style={[
                                        styles.card,
                                        { padding: rs.rcl(24), borderRadius: rs.rcl(26), borderColor: LOGIN_CARD_BORDER },
                                    ]}
                                >
                                    <Text style={[styles.cardTitle, { fontSize: rs.cardTitle }, isRTL && { textAlign: 'right' }]}>
                                        {activeTab === 'connexion' ? t('loginTitle') : t('registerTitle')}
                                    </Text>
                                    <Text style={[styles.cardSubtitle, { fontSize: rs.cardSub }, isRTL && { textAlign: 'right' }]}>
                                        {activeTab === 'connexion' ? t('loginSubtitle') : t('registerSubtitle')}
                                    </Text>

                                    {activeTab === 'inscription' && (
                                        <View style={[styles.formGroup, { marginBottom: rs.rcl(16) }]}>
                                            <View style={styles.labelRow}>
                                                <Text style={[styles.fieldLabel, { fontSize: rs.fieldLbl }, isRTL && { textAlign: 'right' }]}>
                                                    {t('fullName')}
                                                </Text>
                                                <Text style={styles.asterisk}>*</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.inputShell,
                                                    { minHeight: rs.rcl(52), borderRadius: rs.rcl(16) },
                                                    isRTL && { flexDirection: 'row-reverse' },
                                                    formErrors.fullName && styles.inputShellError,
                                                ]}
                                            >
                                                <TextInput
                                                    style={[styles.inputFlex, { fontSize: rs.input }, isRTL && { textAlign: 'right' }]}
                                                    placeholder={t('fullNamePlaceholder')}
                                                    placeholderTextColor="#9ca3af"
                                                    value={formData.fullName}
                                                    onChangeText={(v) => {
                                                        setFormData({ ...formData, fullName: v });
                                                        if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: null });
                                                    }}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => emailInputRef?.focus()}
                                                />
                                            </View>
                                            {formErrors.fullName ? (
                                                <Text style={[styles.errorText, { fontSize: rs.err }]}>{formErrors.fullName}</Text>
                                            ) : null}
                                        </View>
                                    )}

                                    <View style={[styles.formGroup, { zIndex: 2, marginBottom: rs.rcl(16) }]}>
                                        <View style={styles.labelRow}>
                                            <Text style={[styles.fieldLabel, { fontSize: rs.fieldLbl }, isRTL && { textAlign: 'right' }]}>
                                                {t('email')}
                                            </Text>
                                            <Text style={styles.asterisk}>*</Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.inputShell,
                                                { minHeight: rs.rcl(52), borderRadius: rs.rcl(16) },
                                                isRTL && { flexDirection: 'row-reverse' },
                                                formErrors.email && styles.inputShellError,
                                            ]}
                                        >
                                            <TextInput
                                                style={[styles.inputFlex, { fontSize: rs.input }, isRTL && { textAlign: 'right' }]}
                                                placeholder={t('emailPlaceholder')}
                                                placeholderTextColor="#9ca3af"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={formData.email}
                                                onChangeText={(v) => {
                                                    setFormData({ ...formData, email: v });
                                                    if (formErrors.email || formErrors.password) setFormErrors({});
                                                }}
                                                autoComplete="email"
                                                textContentType="emailAddress"
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordInputRef?.focus()}
                                                ref={(ref) => {
                                                    emailInputRef = ref;
                                                }}
                                            />
                                        </View>
                                        {formErrors.email ? <Text style={[styles.errorText, { fontSize: rs.err }]}>{formErrors.email}</Text> : null}
                                    </View>

                                    <View style={[styles.formGroup, { marginBottom: rs.rcl(16) }]}>
                                        <View style={styles.labelRow}>
                                            <Text style={[styles.fieldLabel, { fontSize: rs.fieldLbl }, isRTL && { textAlign: 'right' }]}>
                                                {t('password')}
                                            </Text>
                                            <Text style={styles.asterisk}>*</Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.inputShell,
                                                { minHeight: rs.rcl(52), borderRadius: rs.rcl(16) },
                                                isRTL && { flexDirection: 'row-reverse' },
                                                formErrors.password && styles.inputShellError,
                                            ]}
                                        >
                                            <TextInput
                                                style={[styles.inputFlex, { fontSize: rs.input }, isRTL && { textAlign: 'right' }]}
                                                placeholder={t('passwordPlaceholder')}
                                                placeholderTextColor="#9ca3af"
                                                secureTextEntry={!showPassword}
                                                value={formData.password}
                                                onChangeText={(v) => {
                                                    setFormData({ ...formData, password: v });
                                                    if (formErrors.email || formErrors.password) setFormErrors({});
                                                }}
                                                autoComplete="password"
                                                textContentType="password"
                                                returnKeyType="done"
                                                onSubmitEditing={activeTab === 'connexion' ? handleLogin : handleRegister}
                                                ref={(ref) => {
                                                    passwordInputRef = ref;
                                                }}
                                            />
                                            <TouchableOpacity
                                                style={[styles.togglePwdBtn, { paddingVertical: rs.rcl(12), paddingHorizontal: rs.rcl(10) }]}
                                                onPress={() => setShowPassword(!showPassword)}
                                                hitSlop={8}
                                            >
                                                <Text style={[styles.togglePwdText, { fontSize: rs.err }]}>
                                                    {showPassword ? t('hidePassword') : t('showPassword')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {formErrors.password ? (
                                            <Text style={[styles.errorText, { fontSize: rs.err }]}>{formErrors.password}</Text>
                                        ) : null}
                                    </View>

                                    {activeTab === 'connexion' && (
                                        <View style={[styles.rowBetween, { marginBottom: rs.rcl(18) }, isRTL && { flexDirection: 'row-reverse' }]}>
                                            <TouchableOpacity
                                                style={[styles.checkboxContainer, isRTL && { flexDirection: 'row-reverse' }]}
                                                onPress={() => setRememberMe(!rememberMe)}
                                            >
                                                <View
                                                    style={[
                                                        styles.checkbox,
                                                        rememberMe && styles.checkboxChecked,
                                                        isRTL && { marginRight: 0, marginLeft: 8 },
                                                    ]}
                                                >
                                                    {rememberMe ? <Text style={[styles.checkMark, { fontSize: rs.err }]}>✓</Text> : null}
                                                </View>
                                                <Text style={[styles.rememberText, { fontSize: rs.foot }, isRTL && { marginRight: 8, marginLeft: 0 }]}>
                                                    {t('rememberMe')}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => router.push('/forgot-password')} hitSlop={8}>
                                                <Text style={[styles.forgotText, { fontSize: rs.foot }]}>{t('forgotPassword')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        onPress={activeTab === 'connexion' ? handleLogin : handleRegister}
                                        disabled={loading}
                                        activeOpacity={0.9}
                                        style={{ borderRadius: 999, overflow: 'hidden' }}
                                    >
                                        <LinearGradient
                                            colors={dashboardVibe.primaryCtaGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[styles.primaryGradient, { paddingVertical: rs.rcl(16) }, loading && { opacity: 0.75 }]}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <View style={[styles.primaryButtonInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                                    <Text style={[styles.primaryButtonText, { fontSize: rs.btn }]}>
                                                        {activeTab === 'connexion' ? t('loginButton') : t('registerButton')}
                                                    </Text>
                                                </View>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <View style={[styles.footer, { marginTop: rs.rcl(20) }]}>
                                        {activeTab === 'connexion' ? (
                                            <>
                                                <Text style={[styles.footerText, { fontSize: rs.foot }]}>{t('termsText')}</Text>
                                                <TouchableOpacity onPress={() => router.push('/terms-of-use')} hitSlop={8}>
                                                    <Text style={[styles.footerLink, { fontSize: rs.foot }]}>{t('termsLink')}</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <View style={[{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }, isRTL && { flexDirection: 'row-reverse' }]}>
                                                <Text style={[styles.footerText, { fontSize: rs.foot }]}>{t('alreadyRegistered')} </Text>
                                                <TouchableOpacity onPress={() => setActiveTab('connexion')}>
                                                    <Text style={[styles.forgotText, { fontSize: rs.foot }]}>{t('loginLink')}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
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
    langAnchor: {
        position: 'absolute',
        zIndex: 40,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: authTheme.cardBg,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: authTheme.inputBorder,
        gap: 8,
    },
    langModalRoot: {
        flex: 1,
    },
    langModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(90, 100, 130, 0.22)',
    },
    langModalStrip: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
    },
    langModalCard: {
        backgroundColor: authTheme.cardBg,
        borderRadius: 16,
        padding: 6,
        minWidth: 178,
        borderWidth: 1,
        borderColor: authTheme.cardBorder,
        marginBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#475569',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: { elevation: 5 },
            default: {},
        }),
    },
    langCodeText: {
        fontWeight: '900',
        color: C_NAVY,
        letterSpacing: 0.5,
    },
    langOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
    },
    langOptionActive: {
        backgroundColor: authTheme.langListHighlight,
    },
    langOptionText: {
        color: C_TEXT_DARK,
        fontWeight: '600',
    },
    langOptionTextActive: {
        color: C_BTN_C,
        fontWeight: '800',
    },
    scrollContent: {
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    authContainer: {
        alignItems: 'center',
        alignSelf: 'center',
        width: '100%',
        maxWidth: INIT_W,
    },
    heroCenter: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 0,
    },
    logoBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    brandText: {
        fontWeight: '900',
        color: C_NAVY,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    taglineText: {
        fontWeight: '700',
        textAlign: 'center',
        maxWidth: 340,
        lineHeight: 22,
    },
    taglinePastel: {
        color: '#818cf8',
    },
    tabsOuter: {
        width: '100%',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 252, 255, 0.92)',
        padding: 5,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: LOGIN_INPUT_BORDER,
    },
    tab: {
        flex: 1,
        borderRadius: 100,
        alignItems: 'center',
    },
    tabActiveLogin: {
        backgroundColor: '#dbeafe',
        ...Platform.select({
            ios: {
                shadowColor: '#818cf8',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
            },
            android: { elevation: 2 },
            default: {},
        }),
    },
    tabActiveRegisterBlue: {
        backgroundColor: '#ede9fe',
        ...Platform.select({
            ios: {
                shadowColor: '#a78bfa',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
            },
            android: { elevation: 2 },
            default: {},
        }),
    },
    tabText: {
        fontWeight: '600',
        color: C_TEXT_MUTED,
    },
    tabTextOnPastel: {
        color: '#3730a3',
        fontWeight: '800',
    },
    card: {
        backgroundColor: authTheme.cardBg,
        width: '100%',
        borderWidth: 1,
        borderColor: authTheme.cardBorder,
        ...authCardShadow,
    },
    cardTitle: {
        fontWeight: '800',
        color: C_TEXT_DARK,
        marginBottom: 6,
    },
    cardSubtitle: {
        color: C_TEXT_MUTED,
        marginBottom: 22,
        fontWeight: '500',
        lineHeight: 22,
    },
    formGroup: {},
    fieldLabel: {
        fontWeight: '800',
        color: C_NAVY,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
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
    inputShell: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C_INPUT_INNER,
        borderWidth: 1,
        borderColor: LOGIN_INPUT_BORDER,
    },
    inputShellError: {
        borderColor: '#ef4444',
    },
    inputFlex: {
        flex: 1,
        color: C_TEXT_DARK,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    togglePwdBtn: {
        justifyContent: 'center',
    },
    togglePwdText: {
        color: authTheme.blue,
        fontWeight: '800',
    },
    errorText: {
        color: '#ef4444',
        marginTop: 6,
        fontWeight: '600',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: authTheme.inputBorder,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: authTheme.cardBg,
    },
    checkboxChecked: {
        backgroundColor: '#a5b4fc',
        borderColor: '#818cf8',
    },
    checkMark: {
        color: '#fff',
        fontWeight: '800',
    },
    rememberText: {
        color: C_TEXT_DARK,
        fontWeight: '500',
    },
    forgotText: {
        color: authTheme.blue,
        fontWeight: '800',
    },
    primaryGradient: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '800',
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        color: C_TEXT_MUTED,
        textAlign: 'center',
        fontWeight: '500',
    },
    footerLink: {
        color: authTheme.blue,
        fontWeight: '800',
        textDecorationLine: 'underline',
        marginTop: 4,
    },
});

export default Login;
