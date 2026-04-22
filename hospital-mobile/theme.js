import { Platform } from 'react-native';

/** Login, forgot-password, terms-of-use — warm white-beige screen; accents stay cool. */
export const authTheme = {
    gradient: ['#fdfcfa', '#f8f5f0', '#f2ece4'],
    screenBg: '#f8f5f0',
    navy: '#3d5270',
    blue: '#4f74b8',
    textMuted: '#6b7a94',
    textDark: '#334155',
    /** Tagline / small accents — fresh teal */
    accent: '#2a9d8f',
    inputInner: '#fffdfb',
    cardBg: '#ffffff',
    cardBorder: 'rgba(90, 160, 210, 0.28)',
    inputBorder: 'rgba(100, 170, 220, 0.35)',
    /** Primary CTA: sky → lagoon (more saturation, still friendly) */
    btnGradient: ['#5ec8eb', '#3aa8db', '#2a8fc4'],
    btnMid: '#4cb4e0',
    btnDeep: '#2a8fc4',
    iconMail: '#4f8eea',
    iconLock: '#2db89a',
    iconUser: '#8b6fd6',
    iconGlobe: '#2db5b0',
    /** Hero icon circle — forgot password */
    iconTintForgot: 'rgba(120, 200, 235, 0.42)',
    /** Hero icon circle — terms */
    iconTintTerms: 'rgba(180, 160, 240, 0.38)',
    divider: 'rgba(100, 160, 200, 0.28)',
    topBarChipBg: 'rgba(255,255,255,0.92)',
    topBarChipBorder: 'rgba(100, 170, 215, 0.35)',
    langListHighlight: 'rgba(120, 200, 240, 0.28)',
};

export const authCardShadow = Platform.select({
    ios: {
        shadowColor: '#6b5f52',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
    },
    android: { elevation: 5 },
    default: {},
});

/** Patient dashboard — same family as login (`authTheme`). */
export const dashboardVibe = {
    /** Hero — pastel sky → lilac (type foncée pour le contraste) */
    heroGradient: ['#dbeafe', '#e0e7ff', '#ede9fe', '#fce7f3'],
    bodyBg: authTheme.screenBg,
    /** Wave: cool mist into body */
    waveFill: 'rgba(248, 250, 252, 0.98)',
    heroText: '#3730a3',
    heroTextMuted: 'rgba(55, 48, 163, 0.78)',
    heroMenuIcon: '#4338ca',
    heroMenuButtonBg: 'rgba(255, 255, 255, 0.72)',
    heroMenuButtonBorder: 'rgba(99, 102, 241, 0.22)',
    /** CTAs (connexion, etc.) — même famille que l’ancien hero dashboard, un peu adouci */
    primaryCtaGradient: ['#60a5fa', '#6366f1', '#a78bfa'],
};

/** Fond dégradé doux — login, mot de passe oublié, CGU, sous-couche dashboard, etc. */
export const screenPastelGradient = ['#fffdfb', '#f0f9ff', '#faf5ff'];

/** Écrans patient (liste, profil, documents…) — bleus/violets adoucis, alignés dashboard */
export const patientPastel = {
    pageBg: '#f5f3ff',
    inputBg: '#fafafa',
    primary: '#6366f1',
    primaryDeep: '#4f46e5',
    textHeading: '#3730a3',
    borderInput: 'rgba(191, 219, 254, 0.95)',
    borderCard: 'rgba(165, 180, 252, 0.5)',
};

export const theme = {
    colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        secondary: '#64748b',
        background: '#f1f5f9',
        surface: '#ffffff',
        textMain: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
        danger: '#dc2626',
        success: '#16a34a',
        warning: '#f59e0b',
        dark: '#0f172a',
        lightBlue: '#eff6ff',
        vibrantBlue: '#3b82f6',
        authGradient: ['#fdfcfa', '#f8f5f0'],
        /** Header / accents */
        gradientTop: '#eef2ff',
        gradientMid: '#f8fafc',
        cardBorder: 'rgba(148, 163, 184, 0.35)',
        accentIndigo: '#4f46e5',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        xxl: 28,
        pill: 100,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 8,
        },
    }
};
