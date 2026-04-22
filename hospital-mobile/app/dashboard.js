import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { specialtyToI18nKey } from '../constants/bookingSpecialties';
import { authCardShadow, authTheme, dashboardVibe, screenPastelGradient } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';
import SwipeDeleteRow from './components/SwipeDeleteRow';
import AsyncStorage from './utils/storage';

const PAD = 16;
const GRID_GAP = 12;
const STAT_GAP = 10;
const STAT_H_PAD = PAD - 2;
const SCROLL_TOP_INSET = 12;
const BOTTOM_TABS_CLEARANCE = Platform.OS === 'ios' ? 128 : 116;

const statGlassShadow = Platform.select({
    ios: {
        shadowColor: '#818cf8',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
    },
    android: { elevation: 6 },
    default: {},
});

const P = {
    bodyBg: authTheme.screenBg,
    heroGradient: dashboardVibe.heroGradient,
    text: authTheme.textDark,
    textMuted: authTheme.textMuted,
    link: authTheme.blue,
    navy: authTheme.navy,
    accent: authTheme.accent,
    card: authTheme.cardBg,
    cardBorder: authTheme.cardBorder,
    inputBorder: authTheme.inputBorder,
    aptBgA: '#fdf4ff',
    aptBgB: '#f0f7ff',
    aptBorderA: 'rgba(200, 170, 220, 0.32)',
    aptBorderB: authTheme.inputBorder,
    dateBoxA: '#fce7f3',
    dateNumA: '#a8557c',
    dateMonthA: '#db2777',
    dateBoxB: '#e0f2fe',
    dateNumB: authTheme.navy,
    dateMonthB: authTheme.btnDeep,
    badgeOk: authTheme.accent,
    metaIcon: authTheme.textMuted,
    statBellOrange: '#fb923c',
    ctaBg: '#e0f2fe',
    notifBg: authTheme.inputInner,
    notifBorder: authTheme.inputBorder,
    tileCalBg: '#eff6ff',
    tileCalBorder: '#dbeafe',
    tileCalIcon: '#2563eb',
    tileCalLabel: '#1d4ed8',
    tileDocBg: '#faf5ff',
    tileDocBorder: '#ede9fe',
    tileDocIcon: '#7c3aed',
    tileDocLabel: '#7c3aed',
    tileMapBg: '#ecfdf5',
    tileMapBorder: '#d1fae5',
    tileMapLabel: '#0f766e',
    tileUrgentBg: '#ffe4e6',
    tileUrgentBorder: '#fecdd3',
    tileUrgentLabel: '#be123c',
    healthBg: authTheme.inputInner,
    healthBorder: authTheme.cardBorder,
};

function HeroWave({ width, fill }) {
    const w = width || 360;
    return (
        <View style={styles.heroWaveWrap} pointerEvents="none">
            <Svg width={w} height={32} viewBox={`0 0 ${w} 32`} preserveAspectRatio="none">
                <Path d={`M0,22 Q${w * 0.22},10 ${w * 0.5},16 T${w},14 L${w},32 L0,32 Z`} fill={fill} />
            </Svg>
        </View>
    );
}

function DashboardStatGlass({ title, value, iconEl, onPress, isRTL }) {
    return (
        <TouchableOpacity style={styles.statGlassOuter} onPress={onPress} activeOpacity={0.88}>
            {Platform.OS === 'web' ? (
                <View style={[styles.statBlurFallback, StyleSheet.absoluteFillObject]} />
            ) : (
                <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFillObject} />
            )}
            <View pointerEvents="none" style={[styles.statGlassFront, isRTL && { alignItems: 'stretch' }]}>
                <View style={[styles.statTitleSlot, isRTL && { alignItems: 'flex-end' }]}>
                    <Text
                        style={[styles.statGlassTitle, isRTL && { textAlign: 'right' }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                    >
                        {title}
                    </Text>
                </View>
                <View style={[styles.statBottomBand, isRTL && styles.statBottomBandRtl]}>
                    <Text style={[styles.statGlassValue, isRTL && { textAlign: 'right' }]}>{value}</Text>
                    <View style={styles.statIconInline}>{iconEl}</View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const Dashboard = () => {
    const { width: screenW } = useWindowDimensions();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const scrollRef = useRef(null);
    const { appointments, documents, notifications, setNotifications, patient, API_URL, syncAllData, refreshNotifications, registerNotificationDeleted, logout } = useApp();
    const isRTL = i18n.language === 'ar';
    const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
    const firstName = capitalize(patient.firstName || patient.prenom || '');
    const lastName = capitalize(patient.lastName || patient.nom || '');
    const userName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : patient.name || '';

    const displayAppointments = appointments ? appointments.slice(0, 2) : [];
    const displayNotifications = notifications ? notifications.slice(0, 3) : [];
    const upcomingCount = appointments?.length ?? 0;
    const docCount = documents?.length ?? 0;
    const notifCount = notifications?.length ?? 0;

    const scrollToNotifications = useCallback(() => {
        const aptBlock =
            SCROLL_TOP_INSET +
            56 +
            16 +
            (displayAppointments.length > 0 ? displayAppointments.length * 132 + 72 : 100);
        scrollRef.current?.scrollTo({ y: Math.max(0, aptBlock), animated: true });
    }, [displayAppointments.length]);

    useFocusEffect(
        useCallback(() => {
            let alive = true;
            (async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    if (alive && token) await syncAllData(token);
                } catch {
                }
            })();
            return () => {
                alive = false;
            };
        }, [syncAllData])
    );

    const executeDeleteNotification = async (notifId) => {
        if (notifId == null || notifId === '') return;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/api/patients/notifications/${encodeURIComponent(String(notifId))}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err?.error || `Erreur ${res.status}`;
                console.warn('Failed to delete notification:', msg);
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.alert(msg);
                } else {
                    Alert.alert(t('error'), msg);
                }
                return;
            }

            registerNotificationDeleted(notifId);
            setNotifications((prev) => (prev || []).filter((n) => String(n.id) !== String(notifId)));

            await refreshNotifications(token);
            setTimeout(() => {
                void (async () => {
                    const t2 = await AsyncStorage.getItem('token');
                    if (t2) await refreshNotifications(t2);
                })();
            }, 300);
            setTimeout(() => {
                void (async () => {
                    const t2 = await AsyncStorage.getItem('token');
                    if (t2) await refreshNotifications(t2);
                })();
            }, 900);
        } catch (e) {
            console.warn('Delete notification error:', e);
        }
    };

    const handleHeroLogout = useCallback(() => {
        const doLogout = async () => {
            await logout();
            router.replace('/login');
        };
        if (Platform.OS === 'web') {
            void doLogout();
            return;
        }
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Se déconnecter', style: 'destructive', onPress: () => void doLogout() }
            ]
        );
    }, [logout, router]);


    return (
        <View style={styles.root}>
            <LinearGradient colors={screenPastelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.heroShell}>
                <LinearGradient colors={P.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent']}
                    locations={[0, 0.35, 1]}
                    start={{ x: 0.12, y: 0 }}
                    end={{ x: 0.92, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
                <HeroWave width={screenW} fill={dashboardVibe.waveFill} />

                <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroSafe}>
                    <HeaderSidebar
                        activeScreen="dashboard"
                        heroHeader
                        renderMode="header"
                        subtitle={t('platformSubtitle')}
                        onHeroLogoutPress={handleHeroLogout}
                    />
                    <View style={[styles.heroGreeting, isRTL && { alignItems: 'flex-end' }]}>
                        <Text style={[styles.heroHello, isRTL && { textAlign: 'right' }]}>
                            {t('hello')}, {userName || '—'}
                        </Text>
                        <Text style={[styles.heroWelcome, { maxWidth: Math.max(220, screenW - 48) }, isRTL && { textAlign: 'right' }]}>
                            {t('welcomeSubtitle')}
                        </Text>
                    </View>
                </SafeAreaView>

                <View style={[styles.statRow, isRTL && styles.statRowRtl]}>
                    <DashboardStatGlass
                        title={t('upcomingAppointments')}
                        value={String(upcomingCount)}
                        iconEl={<Feather name="calendar" size={22} color={P.tileCalIcon} />}
                        onPress={() => router.push('/appointments')}
                        isRTL={isRTL}
                    />
                    <DashboardStatGlass
                        title={t('navDocuments')}
                        value={String(docCount)}
                        iconEl={<Ionicons name="document-text-outline" size={22} color={P.tileDocIcon} />}
                        onPress={() => router.push('/documents')}
                        isRTL={isRTL}
                    />
                    <DashboardStatGlass
                        title={t('notifications')}
                        value={String(notifCount)}
                        iconEl={<Feather name="bell" size={22} color={P.statBellOrange} />}
                        onPress={scrollToNotifications}
                        isRTL={isRTL}
                    />
                </View>
            </View>

            <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.cardStack}>
                        <View style={styles.surfaceCard}>
                            <View style={[styles.sectionHeadRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={{ flex: 1, paddingRight: isRTL ? 0 : 8, paddingLeft: isRTL ? 8 : 0 }}>
                                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('upcomingAppointments')}</Text>
                                    <Text style={[styles.sectionSubtitleMuted, isRTL && { textAlign: 'right' }]}>{t('yourConsultations')}</Text>
                                </View>
                                <TouchableOpacity onPress={() => router.push('/appointments')} hitSlop={12}>
                                    <Text style={styles.viewAllLink}>{t('viewAll')}</Text>
                                </TouchableOpacity>
                            </View>

                            {displayAppointments.map((apt, index) => {
                                const pastel = index % 2 === 0;
                                return (
                                <View
                                    key={index}
                                    style={[
                                        styles.aptCardBox,
                                        pastel ? styles.aptCardBoxPastelA : styles.aptCardBoxPastelB,
                                        isRTL && { flexDirection: 'row-reverse' },
                                    ]}
                                >
                                    <View style={[styles.aptDateBox, pastel ? styles.aptDateBoxPastelA : styles.aptDateBoxPastelB]}>
                                        <Text style={[styles.aptDateBoxNum, pastel ? styles.aptDateNumA : styles.aptDateNumB]}>{apt.date}</Text>
                                        <Text style={[styles.aptDateBoxMonth, pastel ? styles.aptDateMonthA : styles.aptDateMonthB]}>{t(apt.month)}.</Text>
                                    </View>
                                    <View style={[styles.aptDetailsBox, isRTL ? { marginRight: 14, marginLeft: 0 } : { marginLeft: 14 }]}>
                                        <View style={[styles.aptDoctorHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.aptDoctorName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                                                    {t(apt.doctor)}
                                                </Text>
                                                <Text style={[styles.aptSpecialtyName, isRTL && { textAlign: 'right' }]}>
                                                    {t(specialtyToI18nKey(apt.specialty))}
                                                </Text>
                                            </View>
                                            <View style={[styles.confirmBadge, isRTL ? { marginLeft: 0, marginRight: 10 } : { marginLeft: 10 }]}>
                                                <Text style={styles.confirmBadgeText}>{t('confirmed')}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.aptMetaContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                                            <View style={[styles.metaRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                                <Feather name="clock" size={14} color={P.metaIcon} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                                <Text style={styles.metaLabel}>{apt.time}</Text>
                                            </View>
                                            <View style={[styles.metaRow, isRTL ? { marginRight: 14 } : { marginLeft: 14 }, isRTL && { flexDirection: 'row-reverse' }]}>
                                                <Ionicons name="location-outline" size={14} color={P.metaIcon} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                                <Text style={[styles.metaLabel, { flexShrink: 1 }]} numberOfLines={2}>
                                                    {t(apt.location)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                            })}

                            <TouchableOpacity style={styles.newAptCta} onPress={() => router.push('/appointments')} activeOpacity={0.88}>
                                <Feather name="calendar" size={20} color={P.tileCalIcon} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
                                <Text style={styles.newAptCtaText}>{t('newAppointmentBtn')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.surfaceCard}>
                            <View style={[styles.sectionHeadRow, { marginBottom: displayNotifications.length ? 16 : 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('notifications')}</Text>
                                    <Text style={[styles.sectionSubtitleMuted, isRTL && { textAlign: 'right' }]}>{t('recentUpdates')}</Text>
                                </View>
                            </View>

                            {displayNotifications.length === 0 ? (
                                <View style={styles.notifEmpty}>
                                    <Feather name="bell-off" size={22} color={P.textMuted} />
                                    <Text style={[styles.notifEmptyText, isRTL && { textAlign: 'center' }]}>{t('noNotification')}</Text>
                                </View>
                            ) : (
                                displayNotifications.map((notif, index) => {
                                    const isSpecial = notif.text === 'notif_lab_results';
                                    const rowKey = notif.id != null ? `n-${notif.id}` : `n-idx-${index}`;
                                    return (
                                        <SwipeDeleteRow
                                            key={rowKey}
                                            rowKey={String(notif.id ?? rowKey)}
                                            cornerRadius={16}
                                            accessibilityLabel={t('delete')}
                                            style={{ marginBottom: 10 }}
                                            onDelete={() => void executeDeleteNotification(notif.id)}
                                        >
                                            <Pressable
                                                style={[styles.notifItem, isSpecial && styles.specialNotif]}
                                                onPress={() => notif.link && router.push(notif.link)}
                                            >
                                                <View style={[styles.notifHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                                    {isSpecial ? <Text style={styles.notifIconMarker}>ⓘ</Text> : null}
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={[styles.notifMessageText, isSpecial && styles.specialNotifText, isRTL && { textAlign: 'right' }]}
                                                        >
                                                            {t(notif.text, {
                                                                ...notif.params,
                                                                doctor: notif.params?.doctor ? t(notif.params.doctor) : undefined,
                                                            })}
                                                        </Text>
                                                        <Text style={[styles.notifTimeText, isRTL && { textAlign: 'right' }]}>
                                                            {t(notif.time || 'timeAgoHours', notif.timeParams || { hours: 0 })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        </SwipeDeleteRow>
                                    );
                                })
                            )}
                        </View>

                        <View style={styles.surfaceCard}>
                            <Text style={[styles.sectionTitle, { marginBottom: 14 }, isRTL && { textAlign: 'right' }]}>{t('quickActions')}</Text>
                            <View style={styles.actionsGrid}>
                                <TouchableOpacity
                                    style={[styles.gridTile, styles.gridTileCal, styles.gridTileFull, styles.gridTileLabelOnly]}
                                    onPress={() => router.push('/appointments')}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.gridTileLabel, styles.gridTileLabelCal, isRTL && { textAlign: 'right' }]}>{t('newAppointment')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gridTile, styles.gridTileDoc, styles.gridTileFull, styles.gridTileLabelOnly]}
                                    onPress={() => router.push('/documents')}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.gridTileLabel, styles.gridTileLabelDoc, isRTL && { textAlign: 'right' }]}>{t('myDocuments')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gridTile, styles.gridTileMap, styles.gridTileFull, styles.gridTileLabelOnly]}
                                    onPress={() => router.push('/guidage')}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.gridTileLabel, styles.gridTileLabelMap, isRTL && { textAlign: 'right' }]}>{t('hospitalGuidance')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gridTile, styles.gridTileUrgentPastel, styles.gridTileFull, styles.gridTileLabelOnly]}
                                    onPress={() => router.push('/urgence')}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.gridTileLabel, styles.gridTileLabelUrgentPastel, isRTL && { textAlign: 'right' }]}>{t('navUrgence')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.surfaceCard, styles.surfaceCardHealth]}>
                            <Text style={[styles.sectionTitle, { marginBottom: 16 }, isRTL && { textAlign: 'right' }]}>{t('healthSummary')}</Text>
                            <View style={styles.healthBlock}>
                                <View style={[styles.summaryLine, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Text style={[styles.summaryLabel, isRTL && { textAlign: 'right' }]}>{t('bloodGroup')}</Text>
                                    <Text style={[styles.summaryValue, isRTL && { textAlign: 'right' }]}>{patient.bloodGroup || '—'}</Text>
                                </View>
                                <View style={[styles.summaryLine, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Text style={[styles.summaryLabel, isRTL && { textAlign: 'right' }]}>{t('allergies')}</Text>
                                    <Text style={[styles.summaryValue, isRTL && { textAlign: 'right' }]}>{patient.allergies?.length ?? 0}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileLinkWrap}>
                                <Text style={[styles.viewFullProfileText, isRTL && { textAlign: 'right' }]}>{t('viewFullProfile')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
            <HeaderSidebar activeScreen="dashboard" renderMode="bottom" />
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: P.bodyBg,
    },
    heroShell: {
        minHeight: 272,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'visible',
    },
    heroSafe: {
        zIndex: 2,
        paddingBottom: 142,
    },
    heroGreeting: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        alignItems: 'center',
    },
    heroHello: {
        fontSize: 23,
        fontWeight: '800',
        color: dashboardVibe.heroText,
        letterSpacing: -0.45,
        textAlign: 'center',
    },
    heroWelcome: {
        marginTop: 8,
        marginBottom: 16,
        fontSize: 13,
        fontWeight: '500',
        color: dashboardVibe.heroTextMuted,
        lineHeight: 20,
        textAlign: 'center',
    },
    heroWaveWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 32,
        zIndex: 1,
    },
    statRow: {
        position: 'absolute',
        left: STAT_H_PAD,
        right: STAT_H_PAD,
        bottom: 38,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: STAT_GAP,
        zIndex: 4,
    },
    statRowRtl: {
        flexDirection: 'row-reverse',
    },
    statGlassOuter: {
        flex: 1,
        minWidth: 0,
        height: 124,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.55)',
        ...statGlassShadow,
    },
    statBlurFallback: {
        backgroundColor: 'rgba(255,255,255,0.94)',
    },
    statGlassFront: {
        ...StyleSheet.absoluteFillObject,
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 11,
        justifyContent: 'space-between',
    },
    statTitleSlot: {
        minHeight: 32,
        maxHeight: 32,
        justifyContent: 'flex-start',
        width: '100%',
    },
    statGlassTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: P.textMuted,
        letterSpacing: -0.12,
        lineHeight: 14,
        flexShrink: 1,
    },
    statBottomBand: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 2,
        gap: 6,
    },
    statBottomBandRtl: {
        flexDirection: 'row-reverse',
    },
    statGlassValue: {
        fontSize: 26,
        fontWeight: '900',
        color: P.navy,
        letterSpacing: -0.55,
        flexShrink: 1,
        marginBottom: 1,
    },
    statIconInline: {
        marginBottom: 2,
        opacity: 0.92,
    },
    safe: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: SCROLL_TOP_INSET + 6,
        paddingBottom: BOTTOM_TABS_CLEARANCE,
        paddingHorizontal: PAD,
    },
    cardStack: {
        gap: 16,
    },
    surfaceCard: {
        backgroundColor: P.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: P.cardBorder,
        ...authCardShadow,
    },
    surfaceCardHealth: {
        backgroundColor: P.healthBg,
        borderColor: P.healthBorder,
    },
    sectionHeadRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: P.text,
        letterSpacing: -0.2,
    },
    sectionSubtitleMuted: {
        fontSize: 14,
        color: P.textMuted,
        fontWeight: '500',
        marginTop: 4,
    },
    viewAllLink: {
        fontSize: 14,
        fontWeight: '700',
        color: P.link,
        marginTop: 2,
    },
    aptCardBox: {
        flexDirection: 'row',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
    },
    aptCardBoxPastelA: {
        backgroundColor: P.aptBgA,
        borderColor: P.aptBorderA,
    },
    aptCardBoxPastelB: {
        backgroundColor: P.aptBgB,
        borderColor: P.aptBorderB,
    },
    aptDateBox: {
        width: 60,
        height: 60,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aptDateBoxPastelA: {
        backgroundColor: P.dateBoxA,
    },
    aptDateBoxPastelB: {
        backgroundColor: P.dateBoxB,
    },
    aptDateBoxNum: {
        fontSize: 20,
        fontWeight: '900',
    },
    aptDateNumA: {
        color: P.dateNumA,
    },
    aptDateNumB: {
        color: P.dateNumB,
    },
    aptDateBoxMonth: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    aptDateMonthA: {
        color: P.dateMonthA,
    },
    aptDateMonthB: {
        color: P.dateMonthB,
    },
    aptDetailsBox: {
        flex: 1,
        justifyContent: 'center',
    },
    aptDoctorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    aptDoctorName: {
        fontSize: 15,
        fontWeight: '800',
        color: P.text,
        marginBottom: 4,
    },
    aptSpecialtyName: {
        fontSize: 12,
        color: P.textMuted,
        fontWeight: '500',
    },
    confirmBadge: {
        backgroundColor: P.badgeOk,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    confirmBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    aptMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 12,
        color: P.textMuted,
        fontWeight: '500',
    },
    newAptCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: P.ctaBg,
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 4,
        borderWidth: 1,
        borderColor: P.inputBorder,
    },
    newAptCtaText: {
        fontSize: 15,
        fontWeight: '800',
        color: authTheme.btnDeep,
    },
    notifEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        paddingHorizontal: 16,
        backgroundColor: P.notifBg,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: P.notifBorder,
        gap: 8,
    },
    notifEmptyText: {
        fontSize: 14,
        color: P.textMuted,
        fontWeight: '600',
    },
    notifItem: {
        padding: 14,
        backgroundColor: P.notifBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: P.notifBorder,
    },
    specialNotif: {
        backgroundColor: '#fff0f3',
        borderColor: 'rgba(244, 165, 185, 0.55)',
    },
    notifHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    notifIconMarker: {
        fontSize: 16,
        color: '#e8799a',
        marginRight: 10,
        marginTop: 2,
    },
    notifMessageText: {
        fontSize: 15,
        fontWeight: '700',
        color: P.text,
        lineHeight: 22,
    },
    specialNotifText: {
        color: P.text,
    },
    notifTimeText: {
        fontSize: 12,
        color: P.textMuted,
        fontWeight: '600',
        marginTop: 8,
    },
    actionsGrid: {
        flexDirection: 'column',
        gap: GRID_GAP,
    },
    gridTileFull: {
        width: '100%',
        alignSelf: 'stretch',
    },
    gridTile: {
        minHeight: 88,
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        justifyContent: 'flex-end',
    },
    gridTileLabelOnly: {
        justifyContent: 'center',
        minHeight: 76,
        paddingVertical: 18,
    },
    gridTileCal: {
        backgroundColor: P.tileCalBg,
        borderColor: P.tileCalBorder,
    },
    gridTileDoc: {
        backgroundColor: P.tileDocBg,
        borderColor: P.tileDocBorder,
    },
    gridTileMap: {
        backgroundColor: P.tileMapBg,
        borderColor: P.tileMapBorder,
    },
    gridTileUrgentPastel: {
        backgroundColor: P.tileUrgentBg,
        borderColor: P.tileUrgentBorder,
        ...Platform.select({
            ios: {
                shadowColor: '#fda4af',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
            },
            android: { elevation: 3 },
            default: {},
        }),
    },
    gridTileLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: P.text,
    },
    gridTileLabelCal: {
        color: P.tileCalLabel,
    },
    gridTileLabelDoc: {
        color: P.tileDocLabel,
    },
    gridTileLabelMap: {
        color: P.tileMapLabel,
    },
    gridTileLabelUrgentPastel: {
        color: P.tileUrgentLabel,
    },
    healthBlock: {
        width: '100%',
    },
    summaryLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: P.textMuted,
        fontWeight: '600',
        flexShrink: 1,
    },
    summaryValue: {
        fontSize: 14,
        color: P.text,
        fontWeight: '800',
    },
    profileLinkWrap: {
        marginTop: 8,
    },
    viewFullProfileText: {
        color: P.link,
        fontWeight: '800',
        fontSize: 15,
    },
});

export default Dashboard;
