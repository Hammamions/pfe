import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const Urgence = () => {
    const { t, i18n } = useTranslation();
    const { patient } = useApp();
    const [showConfirm, setShowConfirm] = useState(null);
    const [location, setLocation] = useState({ accuracy: 12, active: true });
    const isRTL = i18n.language === 'ar';

    const handleCall = (number) => {
        setShowConfirm(number);
    };

    const confirmCall = () => {
        Linking.openURL(`tel:${showConfirm}`);
        setShowConfirm(null);
    };

    const infoList = [
        { label: t('bloodGroup'), value: patient.bloodGroup, color: '#000' },
        { label: t('allergies'), value: patient.allergies?.join(', ') || t('noneF'), color: theme.colors.danger },
        { label: t('medicalHistory'), value: `${patient.history?.length || 0} ${t('entries')}`, color: '#000' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="urgence" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.emergencyHeader}>
                    <Text style={styles.emergencyTitle}>{t('medicalEmergency')}</Text>
                    <Text style={styles.emergencySubtitle}>{t('emergencyPageDesc')}</Text>
                </View>

                <View style={styles.card}>
                    <View style={[styles.cardHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Feather name="map-pin" size={18} color={theme.colors.dark} />
                        <View style={[styles.headerText, isRTL && { paddingLeft: 0, paddingRight: 10, alignItems: 'flex-end' }]}>
                            <Text style={styles.cardTitle}>{t('localization')}</Text>
                        </View>
                    </View>
                    <Text style={[styles.cardSubtitle, { marginBottom: 15 }, isRTL && { textAlign: 'right' }]}>{t('locationShared')}</Text>

                    <View style={styles.locationMainBlock}>
                        <View style={styles.locationIconWrapper}>
                            <Feather name="map-pin" size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.locationStatusTitle}>{location.active ? t('locationActive') : `${t('localization')}...`}</Text>
                        <Text style={styles.locationCoords}>48.8566° N, 2.3522° E</Text>
                        <Text style={styles.locationAccuracy}>Précision: ±{location.accuracy} mètres</Text>
                    </View>

                    <View style={styles.addressBlock}>
                        <Text style={[styles.addressLabel, isRTL && { textAlign: 'right' }]}>Adresse estimée:</Text>
                        <Text style={[styles.addressText, isRTL && { textAlign: 'right' }]}>123 Rue de la Santé, 75014 Paris, France</Text>
                    </View>
                </View>

                <View style={styles.callGrid}>
                    <TouchableOpacity
                        style={[styles.callBtn, styles.samuBtn]}
                        onPress={() => handleCall('190')}
                    >
                        <Text style={styles.callName}>{t('samu')} - 190</Text>
                        <Text style={styles.callTag}>{t('samuTag')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.callBtn, styles.fireBtn]}
                        onPress={() => handleCall('198')}
                    >
                        <Text style={styles.callName}>{t('firefighters')} - 198</Text>
                        <Text style={styles.callTag}>{t('firefightersTag')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: theme.colors.danger }]}>
                    <Text style={[styles.cardTitle, { marginBottom: 15 }, isRTL && { textAlign: 'right' }]}>{t('yourInfo')}</Text>
                    {infoList.map((info, idx) => (
                        <View key={idx} style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                            <Text style={styles.infoLabel}>{info.label}</Text>
                            <Text style={[styles.infoValue, { color: info.color }]}>{info.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { marginBottom: 15 }, isRTL && { textAlign: 'right' }]}>{t('importantInfo')}</Text>

                    <Text style={[styles.instrHeading, isRTL && { textAlign: 'right' }]}>{t('whenToCallSamu')}</Text>
                    <View style={styles.instrList}>
                        {[t('heartAttack'), t('breathingDifficulties'), t('lossOfConsciousness')].map((item, i) => (
                            <View key={i} style={[styles.instrItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={[styles.instrText, isRTL && { textAlign: 'right', paddingLeft: 0, paddingRight: 8 }]}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={[styles.instrHeading, { marginTop: 15 }, isRTL && { textAlign: 'right' }]}>{t('infoToCommunicate')}</Text>
                    <View style={styles.instrList}>
                        {[t('exactLocation'), t('emergencyNature'), t('victimState')].map((item, i) => (
                            <View key={i} style={[styles.instrItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                <Text style={[styles.check, { color: '#16a34a' }]}>✓</Text>
                                <Text style={[styles.instrText, { color: '#166534' }, isRTL && { textAlign: 'right', paddingLeft: 0, paddingRight: 8 }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>

            <Modal transparent visible={!!showConfirm} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('confirmCall')}</Text>
                        <Text style={styles.modalSub}>
                            {t('callConfirmMsg')} {showConfirm === '190' ? t('samu') : t('firefighters')}?
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(null)}>
                                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmCallBtn} onPress={confirmCall}>
                                <Text style={styles.confirmCallText}>{t('call')} {showConfirm}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    emergencyHeader: {
        backgroundColor: '#fef2f2',
        borderRadius: 24,
        padding: 25,
        borderWidth: 1,
        borderColor: '#fecaca',
        alignItems: 'center',
        marginBottom: 20,
    },
    emergencyTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#991b1b',
        marginBottom: 8,
    },
    emergencySubtitle: {
        fontSize: 14,
        color: '#b91c1c',
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 15,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.dark,
    },
    cardSubtitle: {
        fontSize: 13,
        color: theme.colors.textMuted,
        lineHeight: 18,
    },
    locationMainBlock: {
        backgroundColor: '#eef2ff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 15,
    },
    locationIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        ...theme.shadows.sm,
    },
    locationStatusTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 6,
    },
    locationCoords: {
        fontSize: 14,
        color: theme.colors.textMain,
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    locationAccuracy: {
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    addressBlock: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 15,
    },
    addressLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textMain,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: theme.colors.textMuted,
        lineHeight: 18,
    },
    callGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 15,
    },
    callBtn: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    samuBtn: {
        backgroundColor: '#ef4444',
    },
    fireBtn: {
        backgroundColor: '#f97316',
    },
    callName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    callTag: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 14,
        color: theme.colors.textMuted,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    instrHeading: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.dark,
        marginBottom: 10,
    },
    instrList: {
        gap: 8,
    },
    instrItem: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    bullet: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
    check: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    instrText: {
        fontSize: 13,
        paddingLeft: 8,
        fontWeight: '500',
        color: '#475569',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 30,
        backdropFilter: 'blur(10px)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 10,
    },
    modalSub: {
        fontSize: 15,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    confirmCallBtn: {
        flex: 2,
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 15,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '700',
        color: theme.colors.textMuted,
    },
    confirmCallText: {
        fontWeight: '800',
        color: '#fff',
    },
});

export default Urgence;
