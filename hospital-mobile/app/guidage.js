import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { patientPastel, theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const Guidage = () => {
    const { t, i18n } = useTranslation();
    const { services, equipments } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeNav, setActiveNav] = useState(null);
    const isRTL = i18n.language === 'ar';

    const filteredDepartments = services.filter(dep => {
        const trName = t(dep.name.toLowerCase()) || dep.name;
        return dep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleNav = (depName) => {
        setActiveNav(depName);
    };

    const displayTranslation = (text) => {
        if (text === null || text === undefined) return '';
        const stringText = String(text);
        const key = stringText.toLowerCase();
        const tr = t(key);
        return tr === key ? stringText : tr;
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="guidage" />

            <View style={styles.headerBox}>
                <View style={[styles.searchBox, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Feather name="search" size={18} color="#94a3b8" style={!isRTL ? { marginRight: 10 } : { marginLeft: 10 }} />
                    <TextInput
                        style={[styles.searchInput, isRTL && { textAlign: 'right' }, { outlineStyle: 'none' }]}
                        placeholder={t('searchServicePlaceholder')}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {activeNav && (
                    <View style={styles.navActiveCard}>
                        <View style={[styles.navHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                            <View style={isRTL && { alignItems: 'flex-end' }}>
                                <Text style={styles.navStatus}>{t('navigationInProgress')}</Text>
                                <Text style={styles.navDestination}>{t('towards')}: {displayTranslation(activeNav)}</Text>
                            </View>
                            <TouchableOpacity style={styles.stopBtn} onPress={() => setActiveNav(null)}>
                                <Text style={styles.stopBtnText}>{t('stop')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.stepList}>
                            <View style={[styles.stepItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={styles.stepLineBox}>
                                    <View style={styles.stepDotActive} />
                                    <View style={styles.stepVLine} />
                                </View>
                                <View style={[styles.stepTextContent, isRTL && { paddingLeft: 0, paddingRight: 15, alignItems: 'flex-end' }]}>
                                    <Text style={styles.stepTitle}>{t('followSignage')}</Text>
                                    <Text style={styles.stepDesc}>{t('blueSignsInCorridors')}</Text>
                                </View>
                            </View>

                            <View style={[styles.stepItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={styles.stepLineBox}>
                                    <View style={styles.stepDot} />
                                    <View style={styles.stepVLine} />
                                </View>
                                <View style={[styles.stepTextContent, isRTL && { paddingLeft: 0, paddingRight: 15, alignItems: 'flex-end' }]}>
                                    <Text style={styles.stepTitle}>{t('askReception')}</Text>
                                    <Text style={styles.stepDesc}>{t('staffCanHelp')}</Text>
                                </View>
                            </View>

                            <View style={[styles.stepItem, { marginBottom: 0 }, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={styles.stepLineBox}>
                                    <View style={styles.stepDot} />
                                </View>
                                <View style={[styles.stepTextContent, isRTL && { paddingLeft: 0, paddingRight: 15, alignItems: 'flex-end' }]}>
                                    <Text style={styles.stepTitle}>{t('arrivalAt')} {displayTranslation(activeNav)}</Text>
                                    <Text style={styles.stepDesc}>{t('showCard')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('servicesDepartments')}</Text>
                <View style={styles.depGrid}>
                    {filteredDepartments.map((dep) => (
                        <TouchableOpacity
                            key={dep.id}
                            style={styles.depCard}
                            onPress={() => handleNav(dep.name)}
                        >
                            <View style={[styles.depHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                                <View style={[styles.depIconContainer, { backgroundColor: dep.bgColor }]}>
                                    <Feather name={dep.icon} size={22} color={dep.color} />
                                </View>
                                <Text style={styles.depFloor}>{displayTranslation(dep.floor)}</Text>
                            </View>
                            <Text style={[styles.depName, isRTL && { textAlign: 'right' }]}>{displayTranslation(dep.name)}</Text>
                            <Text style={[styles.depRoom, isRTL && { textAlign: 'right' }]}>{t('room')}: {displayTranslation(dep.location)}</Text>
                            <View style={styles.navBadge}>
                                <Text style={styles.navBadgeText}>{t('startNavigation')} →</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 10 }, isRTL && { textAlign: 'right' }]}>{t('equipmentsServices')}</Text>
                <View style={styles.eqGrid}>
                    {equipments.map((eq, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.eqCard}
                            onPress={() => handleNav(eq.name)}
                        >
                            <View style={[styles.eqIconContainer, !isRTL ? { marginRight: 15 } : { marginLeft: 15 }, { backgroundColor: eq.bgColor }]}>
                                <Feather name={eq.icon} size={22} color={eq.color} />
                            </View>
                            <View style={[styles.eqInfo, isRTL && { alignItems: 'flex-end' }]}>
                                <Text style={styles.eqName}>{displayTranslation(eq.name)}</Text>
                                <Text style={styles.eqFloor}>{displayTranslation(eq.location)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.planBox}>
                    <Text style={styles.planTitle}>{t('hospitalPlan')}</Text>
                    <Text style={styles.planSub}>{t('buildingOverview')}</Text>
                    <View style={styles.planMap}>
                        <Feather name="map" size={40} color={theme.colors.primary} style={{ marginBottom: 10 }} />
                        <Text style={styles.mapText}>{t('interactiveMap')}</Text>
                        <Text style={styles.mapAvail}>{t('mapAvailable')}</Text>
                    </View>
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
    headerBox: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textMain,
    },
    scrollContent: {
        padding: 20,
    },
    navActiveCard: {
        backgroundColor: theme.colors.dark,
        borderRadius: 24,
        padding: 20,
        marginBottom: 25,
        ...theme.shadows.md,
    },
    navHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 15,
        marginBottom: 15,
    },
    navStatus: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    navDestination: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    stopBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    stopBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    stepList: {
        paddingLeft: 10,
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    stepLineBox: {
        width: 20,
        alignItems: 'center',
    },
    stepDotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        zIndex: 2,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        zIndex: 2,
    },
    stepVLine: {
        position: 'absolute',
        top: 10,
        width: 2,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    stepTextContent: {
        paddingLeft: 15,
        flex: 1,
    },
    stepTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    stepDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 15,
    },
    depGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    depCard: {
        width: (width - 55) / 2,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        ...theme.shadows.sm,
    },
    depHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    depIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    depFloor: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textMuted,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 10,
    },
    depName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    depRoom: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginBottom: 12,
    },
    navBadge: {
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    navBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    eqGrid: {
        gap: 12,
        marginBottom: 30,
    },
    eqCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 18,
        ...theme.shadows.sm,
    },
    eqIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eqInfo: {
        flex: 1,
    },
    eqName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.dark,
    },
    eqFloor: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    planBox: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 25,
        marginBottom: 30,
        ...theme.shadows.sm,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.dark,
        marginBottom: 4,
    },
    planSub: {
        fontSize: 13,
        color: theme.colors.textMuted,
        marginBottom: 20,
    },
    planMap: {
        backgroundColor: patientPastel.pageBg,
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    mapText: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textMain,
        marginBottom: 4,
    },
    mapAvail: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
});

export default Guidage;
