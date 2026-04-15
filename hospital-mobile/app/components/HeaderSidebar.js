import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = Platform.OS === 'web' ? Math.min(320, width * 0.8) : width * 0.8;

const SidebarItem = ({ label, icon, iconType = 'feather', onPress, active = false, urgent = false, isRTL = false }) => {
    return (
        <TouchableOpacity
            style={[
                styles.sidebarItem,
                active && styles.sidebarItemActive,
                urgent && styles.sidebarItemUrgent,
                isRTL && { flexDirection: 'row-reverse' },
            ]}
            onPress={onPress}
        >
            <View style={[styles.sidebarItemIconBox, active && styles.sidebarItemIconBoxActive, urgent && styles.sidebarItemIconBoxUrgent, isRTL && { marginRight: 0, marginLeft: 12 }]}>
                {iconType === 'feather' ? (
                    <Feather name={icon} size={18} color={urgent ? '#fff' : active ? '#2563eb' : '#64748b'} />
                ) : (
                    <Ionicons name={icon} size={18} color={urgent ? '#fff' : active ? '#2563eb' : '#64748b'} />
                )}
            </View>
            <Text style={[
                styles.sidebarLabel,
                active && styles.sidebarLabelActive,
                urgent && styles.sidebarLabelUrgent,
                isRTL && { textAlign: 'right' },
            ]}>
                {label}
            </Text>
            {active && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
    );
};

export default function HeaderSidebar({ activeScreen = 'dashboard', title, subtitle, rightComponent }) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const isRTL = i18n.language === 'ar';

    const [sidebarVisible, setSidebarVisible] = useState(false);

    const initialTranslate = isRTL ? -SIDEBAR_WIDTH : SIDEBAR_WIDTH;
    const [slideAnim] = useState(new Animated.Value(initialTranslate));

    useEffect(() => {
        if (sidebarVisible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: initialTranslate,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [sidebarVisible, isRTL, initialTranslate, slideAnim]);

    const toggleSidebar = () => {
        if (sidebarVisible) {
            Animated.timing(slideAnim, {
                toValue: initialTranslate,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setSidebarVisible(false));
        } else {
            setSidebarVisible(true);
        }
    };

    const navigateTo = (route) => {
        toggleSidebar();
        router.push(route);
    };

    return (
        <>
            <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
                    <Feather name="menu" size={22} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{title || t('brand')}</Text>
                    {subtitle !== null && (
                        <Text style={styles.headerSubtitle}>{subtitle || t('platformSubtitle')}</Text>
                    )}
                </View>
                {rightComponent ? rightComponent : <View style={{ width: 44 }} />}
            </View>

            <Modal
                transparent={true}
                visible={sidebarVisible}
                onRequestClose={toggleSidebar}
                animationType="none"
            >
                <View style={[styles.modalOverlay, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
                    <Pressable style={styles.modalBackdrop} onPress={toggleSidebar} />
                    <Animated.View style={[
                        styles.sidebarContainer,
                        isRTL ? { borderTopRightRadius: 24, borderBottomRightRadius: 24 } : { borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
                        { transform: [{ translateX: slideAnim }] }
                    ]}>
                        <View style={styles.sidebarHeader}>
                            <View style={styles.sidebarLogoRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Image source={require('../../assets/logo.png')} style={styles.sidebarLogo} resizeMode="contain" />
                                    <View>
                                        <Text style={styles.sidebarBrandTitle}>{t('brand')}</Text>
                                        <Text style={styles.sidebarBrandSubtitle}>{t('platformSubtitle')}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={toggleSidebar} style={styles.closeSidebarBtn}>
                                    <Feather name="x" size={22} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        </View>


                        <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.sidebarSectionLabel, isRTL && { textAlign: 'right' }]}>{isRTL ? 'القائمة الرئيسية' : (t('navDashboard') === 'Tableau de bord' ? 'MENU PRINCIPAL' : 'MAIN MENU')}</Text>

                            <SidebarItem
                                label={t('navDashboard')}
                                icon="home"
                                active={activeScreen === 'dashboard'}
                                onPress={() => navigateTo('/dashboard')}
                                isRTL={isRTL}
                            />
                            <SidebarItem
                                label={t('navProfile')}
                                icon="user"
                                active={activeScreen === 'profile'}
                                onPress={() => navigateTo('/profile')}
                                isRTL={isRTL}
                            />
                            <SidebarItem
                                label={t('navAppointments')}
                                icon="calendar"
                                active={activeScreen === 'appointments'}
                                onPress={() => navigateTo('/appointments')}
                                isRTL={isRTL}
                            />
                            <SidebarItem
                                label={t('navDocuments')}
                                icon="document-text-outline"
                                iconType="ionicons"
                                active={activeScreen === 'documents'}
                                onPress={() => navigateTo('/documents')}
                                isRTL={isRTL}
                            />
                            <SidebarItem
                                label={t('navPrescriptions')}
                                icon="file-text"
                                active={activeScreen === 'prescription'}
                                onPress={() => navigateTo('/prescription')}
                                isRTL={isRTL}
                            />
                            <SidebarItem
                                label={t('navGuidage')}
                                icon="map-pin"
                                active={activeScreen === 'guidage'}
                                onPress={() => navigateTo('/guidage')}
                                isRTL={isRTL}
                            />

                            <View style={styles.sidebarDivider} />

                            <SidebarItem
                                label={t('navUrgence')}
                                icon="alert-circle"
                                urgent
                                onPress={() => navigateTo('/urgence')}
                                isRTL={isRTL}
                            />

                            <View style={styles.sidebarDivider} />

                            <SidebarItem
                                label={t('navLogout')}
                                icon="log-out"
                                onPress={() => navigateTo('/login')}
                                isRTL={isRTL}
                            />
                        </ScrollView>

                        <View style={styles.sidebarFooter}>
                            <Text style={styles.sidebarFooterText}>© 2026 TuniSanté</Text>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
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
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
    },
    menuButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
    },
    modalOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    sidebarContainer: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'web' ? 20 : 50,
        shadowColor: '#000',
        shadowOffset: { width: -5, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 15,
        zIndex: 10,
    },
    sidebarHeader: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: 8,
    },
    sidebarLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sidebarLogo: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    sidebarBrandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.3,
    },
    sidebarBrandSubtitle: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 1,
    },
    closeSidebarBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sidebarNav: {
        flex: 1,
        paddingHorizontal: 12,
    },
    sidebarSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 2,
        position: 'relative',
    },
    sidebarItemActive: {
        backgroundColor: '#eff6ff',
    },
    sidebarItemUrgent: {
        backgroundColor: '#fef2f2',
        marginTop: 4,
    },
    sidebarItemIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sidebarItemIconBoxActive: {
        backgroundColor: '#dbeafe',
    },
    sidebarItemIconBoxUrgent: {
        backgroundColor: '#fee2e2',
    },
    sidebarLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        flex: 1,
    },
    sidebarLabelActive: {
        color: '#2563eb',
        fontWeight: '700',
    },
    sidebarLabelUrgent: {
        color: '#dc2626',
        fontWeight: '700',
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2563eb',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 8,
        marginHorizontal: 12,
    },
    sidebarFooter: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    sidebarFooterText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
        textAlign: 'center',
    },
});
