import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { dashboardVibe, patientPastel, theme } from '../../theme';
import { useApp } from '../AppContext';

export default function HeaderSidebar({
    activeScreen = 'dashboard',
    title,
    subtitle,
    rightComponent,
    heroHeader = false,
    onHeroLogoutPress,
    renderMode = 'full',
}) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { logout } = useApp();
    const isRTL = i18n.language === 'ar';

    const handleHeaderLogout = useCallback(() => {
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

    const brandTitle = title || t('brand');
    const brandSubtitle = subtitle !== null ? (subtitle || t('platformSubtitle')) : null;
    const tabs = [
        { key: 'dashboard', label: 'Accueil', icon: 'home', route: '/dashboard' },
        { key: 'appointments', label: 'RDV', icon: 'calendar', route: '/appointments' },
        { key: 'documents', label: 'Docs', icon: 'file-text', route: '/documents' },
        { key: 'guidage', label: 'Guide', icon: 'map-pin', route: '/guidage' },
        { key: 'urgence', label: 'Urgence', icon: 'alert-circle', route: '/urgence' },
        { key: 'feedback', label: 'Feed', icon: 'message-square', route: '/feedback' },
        { key: 'profile', label: 'Profil', icon: 'user', route: '/profile' },
    ];
    const showHeader = renderMode === 'full' || renderMode === 'header';
    const showBottomTabs = renderMode === 'full' || renderMode === 'bottom';

    return (
        <>
            {showHeader && (heroHeader ? (
                <View style={[styles.headerHero, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.headerHeroBrand, isRTL && { alignItems: 'flex-end' }]}>
                        <View style={[styles.brandRow, isRTL && styles.brandRowRtl]}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.brandLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.headerHeroTitle}>{brandTitle}</Text>
                        </View>
                        {brandSubtitle != null ? (
                            <Text style={styles.headerHeroSubtitle}>{brandSubtitle}</Text>
                        ) : null}
                    </View>
                    <View style={[styles.headerHeroActions, isRTL && styles.headerHeroActionsRtl]}>
                        {typeof onHeroLogoutPress === 'function' ? (
                            <TouchableOpacity
                                onPress={onHeroLogoutPress}
                                style={styles.menuButtonHero}
                                accessibilityRole="button"
                                accessibilityLabel={t('navLogout')}
                            >
                                <Feather name="log-out" size={18} color={dashboardVibe.heroText} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            ) : (
                <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                    <TouchableOpacity
                        onPress={handleHeaderLogout}
                        style={styles.headerLogoutBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('navLogout')}
                    >
                        <Feather name="log-out" size={20} color={patientPastel.textHeading} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <View style={[styles.brandRow, isRTL && styles.brandRowRtl]}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.brandLogoSmall}
                                resizeMode="contain"
                            />
                            <Text style={styles.headerTitle}>{brandTitle}</Text>
                        </View>
                        {subtitle !== null && (
                            <Text style={styles.headerSubtitle}>{brandSubtitle}</Text>
                        )}
                    </View>
                    {rightComponent ? rightComponent : <View style={{ width: 44 }} />}
                </View>
            ))}
            {showBottomTabs && (
            <View pointerEvents="box-none" style={styles.bottomTabsWrap}>
                <View style={[styles.bottomTabs, isRTL && styles.bottomTabsRtl]}>
                    {tabs.map((tab) => {
                        const isActive = activeScreen === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.bottomTabItem, isActive && styles.bottomTabItemActive]}
                                onPress={() => {
                                    if (!isActive) router.replace(tab.route);
                                }}
                                activeOpacity={0.9}
                            >
                                <Feather
                                    name={tab.icon}
                                    size={18}
                                    color={isActive ? patientPastel.primaryDeep : '#94a3b8'}
                                />
                                <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]} numberOfLines={1}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    headerHero: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: 'transparent',
    },
    headerHeroBrand: {
        flex: 1,
        alignItems: 'flex-start',
        paddingRight: 12,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandRowRtl: {
        flexDirection: 'row-reverse',
    },
    brandLogo: {
        width: 30,
        height: 30,
        marginEnd: 8,
    },
    brandLogoSmall: {
        width: 22,
        height: 22,
        marginEnd: 6,
    },
    headerHeroTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: dashboardVibe.heroText,
        letterSpacing: -0.3,
    },
    headerHeroSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: dashboardVibe.heroTextMuted,
        marginTop: 4,
    },
    headerHeroActions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    headerHeroActionsRtl: {
        flexDirection: 'row-reverse',
    },
    menuButtonHero: {
        position: 'relative',
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: dashboardVibe.heroMenuButtonBg,
        borderWidth: 1,
        borderColor: dashboardVibe.heroMenuButtonBorder,
    },
    header: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: theme?.colors?.background || '#f8fafc',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: patientPastel.textHeading,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
    },
    headerLogoutBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bottomTabsWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Platform.OS === 'ios' ? 12 : 10,
        paddingHorizontal: 10,
        zIndex: 2000,
    },
    bottomTabs: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...theme.shadows.md,
    },
    bottomTabsRtl: {
        flexDirection: 'row-reverse',
    },
    bottomTabItem: {
        flex: 1,
        minHeight: 44,
        marginHorizontal: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    bottomTabItemActive: {
        backgroundColor: '#eef2ff',
    },
    bottomTabLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
    },
    bottomTabLabelActive: {
        color: patientPastel.primaryDeep,
    },
});
