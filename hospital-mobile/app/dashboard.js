import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const PillIcon = ({ color, size }) => (
    <View style={{
        width: size,
        height: size * 0.55,
        borderRadius: size * 0.275,
        borderWidth: 2,
        borderColor: color,
        flexDirection: 'row',
        overflow: 'hidden',
    }}>
        <View style={{ width: '50%', height: '100%', backgroundColor: color }} />
    </View>
);

const Dashboard = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { appointments, notifications, patient, prescriptions, documents } = useApp();
    const isRTL = i18n.language === 'ar';
    const userName = patient.firstName && patient.lastName
        ? `${patient.firstName} ${patient.lastName}`
        : patient.name;

    const [notificationsY, setNotificationsY] = useState(0);
    const scrollViewRef = useRef(null);

    const stats = [
        { label: t('upcomingAppointments'), value: appointments.length.toString(), link: '/appointments', color: '#eff6ff', icon: <Feather name="calendar" size={24} color="#3b82f6" /> },
        { label: t('activePrescriptions'), value: prescriptions.length.toString(), link: '/prescription', color: '#f0fdf4', icon: <PillIcon color="#22c55e" size={26} /> },
        { label: t('documents'), value: documents.length.toString(), link: '/documents', color: '#faf5ff', icon: <Ionicons name="document-text-outline" size={24} color="#a855f7" /> },
        { label: t('notifications'), value: notifications?.length?.toString() || '0', color: '#fff7ed', icon: <Feather name="bell" size={24} color="#f97316" />, isNotif: true },
    ];

    const scrollToNotifications = () => {
        scrollViewRef.current?.scrollTo({ y: notificationsY - 20, animated: true });
    };

    const displayAppointments = appointments ? appointments.slice(0, 2) : [];
    const displayNotifications = notifications ? notifications.slice(0, 3) : [];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <HeaderSidebar activeScreen="dashboard" />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                <View style={[styles.welcomeSection, isRTL && { alignItems: 'flex-end' }]}>
                    <Text style={styles.welcomeTitle}>{t('hello')}, {t(patient.firstName)} {t(patient.lastName)} </Text>
                    <Text style={styles.welcomeSubtitle}>{t('welcomeSubtitle')}</Text>
                </View>

                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.statCard}
                            onPress={() => stat.isNotif ? scrollToNotifications() : router.push(stat.link)}
                        >
                            <View style={styles.statTextGroup}>
                                <Text style={[styles.statLabel, isRTL && { textAlign: 'left' }]}>{stat.label}</Text>
                                <Text style={[styles.statValue, isRTL && { textAlign: 'left' }]}>{stat.value}</Text>
                            </View>
                            <View style={[styles.statIconCircle, { backgroundColor: stat.color }]}>
                                {stat.icon}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>


                <View style={styles.card}>
                    <View style={[styles.sectionHeader, { alignItems: 'flex-start', marginBottom: 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.sectionTitle, { fontSize: 20 }, isRTL && { textAlign: 'right' }]}>{t('upcomingAppointments')}</Text>
                            <Text style={[styles.sectionSubtitle, { marginTop: 4, color: '#64748b' }, isRTL && { textAlign: 'right' }]}>{t('yourConsultations')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/appointments')} style={{ marginTop: 2 }}>
                            <View style={[styles.viewAllBtn, isRTL && { flexDirection: 'row-reverse' }]}>
                                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
                                <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={16} color="#0f172a" style={{ marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {displayAppointments.map((apt, index) => (
                        <View key={index} style={styles.aptCardBox}>
                            <View style={styles.aptDateBox}>
                                <Text style={styles.aptDateBoxNum}>{apt.date}</Text>
                                <Text style={styles.aptDateBoxMonth}>{t(apt.month)}.</Text>
                            </View>

                            <View style={styles.aptDetailsBox}>
                                <View style={styles.aptDoctorHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.aptDoctorName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{t(apt.doctor)}</Text>
                                        <Text style={[styles.aptSpecialtyName, isRTL && { textAlign: 'right' }]}>{t(apt.specialty)}</Text>
                                    </View>
                                    <View style={[styles.confirmBadge, { marginLeft: 12 }]}>
                                        <Text style={styles.confirmBadgeText}>{t('confirmed')}</Text>
                                    </View>
                                </View>

                                <View style={styles.aptMetaContainer}>
                                    <View style={styles.metaRow}>
                                        <Feather name="clock" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                        <Text style={styles.metaLabel}>{apt.time}</Text>
                                    </View>
                                    <View style={[styles.metaRow, { marginLeft: 16 }]}>
                                        <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                        <Text style={[styles.metaLabel, { flexShrink: 1 }]} numberOfLines={2}>{t(apt.location)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.newAptOutlineBtn} onPress={() => router.push('/appointments')}>
                        <Feather name="calendar" size={18} color="#0f172a" style={{ marginRight: 10 }} />
                        <Text style={styles.newAptOutlineBtnText}>{t('newAppointmentBtn')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('activePrescriptions')}</Text>
                        <TouchableOpacity onPress={() => router.push('/prescription')}>
                            <Text style={[styles.viewAllText, isRTL && { textAlign: 'left' }]}>{isRTL ? '← ' + t('viewAll') : t('viewAll') + ' →'}</Text>
                        </TouchableOpacity>
                    </View>

                    {prescriptions.length > 0 ? (
                        <View style={styles.prescriptionItem}>
                            <Text style={[styles.presDoctor, isRTL && { textAlign: 'right', alignSelf: 'stretch' }]}>{t(prescriptions[0].doctor)}</Text>
                            <Text style={[styles.presDate, isRTL && { textAlign: 'right', alignSelf: 'stretch' }]}>{prescriptions[0].date}</Text>
                            {prescriptions[0].medications.map((med, idx) => (
                                <Text key={idx} style={[styles.medItem, isRTL && { textAlign: 'right', alignSelf: 'stretch' }]}>
                                    • {t(med.name)} - {med.dosage} {t(med.dosageUnit || '')}
                                </Text>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.emptyText, isRTL && { textAlign: 'right' }]}>{t('noPrescription')}</Text>
                    )}
                </View>

                <View
                    style={styles.card}
                    onLayout={(e) => setNotificationsY(e.nativeEvent.layout.y)}
                >
                    <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('notifications')}</Text>
                        <Text style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}>{t('recentUpdates')}</Text>
                    </View>

                    {displayNotifications.map((notif, index) => {
                        const isSpecial = notif.text === 'notif_lab_results';
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.notifItem, isSpecial && styles.specialNotif]}
                                onPress={() => notif.link && router.push(notif.link)}
                            >
                                <View style={styles.notifHeaderRow}>
                                    {isSpecial && <Text style={styles.notifIconMarker}>ⓘ</Text>}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.notifMessageText, isSpecial && styles.specialNotifText, isRTL && { textAlign: 'right' }]}>
                                            {t(notif.text, {
                                                ...notif.params,
                                                doctor: notif.params?.doctor ? t(notif.params.doctor) : undefined
                                            })}
                                        </Text>
                                        <Text style={[styles.notifTimeText, isRTL && { textAlign: 'right' }]}>
                                            {t(notif.time || 'timeAgoHours', notif.timeParams || { hours: 0 })}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 15 }, isRTL && { textAlign: 'right' }]}>{t('quickActions')}</Text>
                    <View style={styles.actionsList}>
                        <TouchableOpacity style={[styles.actionRowBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={() => router.push('/appointments')}>
                            <Feather name="calendar" size={18} color="#475569" style={[isRTL ? { marginLeft: 15 } : { marginRight: 15 }]} />
                            <Text style={[styles.actionText, isRTL && { textAlign: 'right' }]}>{t('newAppointment')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionRowBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={() => router.push('/documents')}>
                            <Ionicons name="document-text-outline" size={18} color="#475569" style={[isRTL ? { marginLeft: 15 } : { marginRight: 15 }]} />
                            <Text style={[styles.actionText, isRTL && { textAlign: 'right' }]}>{t('myDocuments')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionRowBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={() => router.push('/guidage')}>
                            <Ionicons name="location-outline" size={18} color="#475569" style={[isRTL ? { marginLeft: 15 } : { marginRight: 15 }]} />
                            <Text style={[styles.actionText, isRTL && { textAlign: 'right' }]}>{t('hospitalGuidance')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionRowBtn, styles.urgentBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={() => router.push('/urgence')}>
                            <Feather name="info" size={18} color="#fff" style={[isRTL ? { marginLeft: 15 } : { marginRight: 15 }]} />
                            <Text style={[styles.actionText, { color: '#fff' }, isRTL && { textAlign: 'right' }]}>{t('navUrgence')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: theme.colors.primary }]}>
                    <Text style={[styles.sectionTitle, { marginBottom: 15 }, isRTL && { textAlign: 'right' }]}>{t('healthSummary')}</Text>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, isRTL && { textAlign: 'right' }]}>{t('bloodGroup')}</Text>
                        <Text style={[styles.summaryValue, isRTL && { textAlign: 'right' }]}>{patient.bloodGroup}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, isRTL && { textAlign: 'right' }]}>{t('allergies')}</Text>
                        <Text style={[styles.summaryValue, isRTL && { textAlign: 'right' }]}>{patient.allergies?.length || 0}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, isRTL && { textAlign: 'right' }]}>{t('medicalHistory')}</Text>
                        <Text style={[styles.summaryValue, isRTL && { textAlign: 'right' }]}>{patient.history?.length || 0}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                        <Text style={[styles.viewFullProfileText, isRTL && { textAlign: 'right' }]}>{t('viewFullProfile')}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
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
    },
    scrollContent: {
        paddingBottom: 40,
    },
    welcomeSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    welcomeTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '600',
    },
    statsGrid: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    statCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    statTextGroup: {
        flex: 1,
    },
    statLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0f172a',
    },
    statIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '700',
    },
    aptCardBox: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    aptDateBox: {
        width: 64,
        height: 64,
        backgroundColor: '#e0f2fe',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aptDateBoxNum: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0369a1',
    },
    aptDateBoxMonth: {
        fontSize: 12,
        fontWeight: '700',
        color: '#38bdf8',
        marginTop: 2,
    },
    aptDetailsBox: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    aptDoctorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    aptDoctorName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    aptSpecialtyName: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    confirmBadge: {
        backgroundColor: '#0f172a',
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
        marginTop: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    newAptOutlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 4,
    },
    newAptOutlineBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    prescriptionItem: {
        marginBottom: 10,
    },
    presDoctor: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    presDate: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '700',
        marginBottom: 12,
    },
    medItem: {
        fontSize: 16,
        color: '#0f172a',
        fontWeight: '700',
        marginBottom: 8,
    },
    notifItem: {
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 10,
    },
    specialNotif: {
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    notifHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    notifIconMarker: {
        fontSize: 18,
        color: '#e11d48',
        marginRight: 10,
        marginTop: 2,
    },
    notifMessageText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: 24,
    },
    specialNotifText: {
        color: '#0f172a',
    },
    notifTimeText: {
        fontSize: 15,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 4,
    },
    actionsList: {
        marginTop: 5,
    },
    actionRowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    urgentBtn: {
        backgroundColor: '#e11d48',
        borderColor: '#e11d48',
    },
    smallActionIcon: {
        width: 18,
        height: 18,
        resizeMode: 'contain',
        opacity: 0.9,
    },
    urgentIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    summaryLabel: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '700',
    },
    summaryValue: {
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '900',
    },
    viewFullProfileText: {
        color: theme.colors.primary,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 15,
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        padding: 20,
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebarContainer: {
        width: Dimensions.get('window').width * 0.8,
        height: '100%',
        backgroundColor: '#fff',
        paddingTop: 50,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    sidebarHeader: {
        paddingHorizontal: 20,
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sidebarLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sidebarLogoBox: {
        width: 54,
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sidebarLogoText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    sidebarBrandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    sidebarBrandSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    closeSidebarBtn: {
        marginLeft: 'auto',
        padding: 8,
    },
    sidebarNav: {
        flex: 1,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    sidebarItemActive: {
        backgroundColor: '#eff6ff',
    },
    sidebarItemUrgent: {
        backgroundColor: '#e11d48',
        marginTop: 10,
    },
    sidebarItemIcon: {
        marginRight: 16,
    },
    sidebarItemText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
    },
    sidebarItemTextActive: {
        color: theme.colors.primary,
    },
    sidebarItemTextUrgent: {
        color: '#fff',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 15,
        marginHorizontal: 20,
    },
});

export default Dashboard;
