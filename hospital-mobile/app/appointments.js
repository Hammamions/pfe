import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BOOKING_SPECIALTIES, specialtyToI18nKey } from '../constants/bookingSpecialties';
import { dashboardVibe, patientPastel, theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';
import SwipeDeleteRow from './components/SwipeDeleteRow';
import { getDocumentAsync } from './utils/pickDocument';
import AsyncStorage from './utils/storage';

const Appointments = () => {
    const { t, i18n } = useTranslation();
    const { appointments = [], setAppointments, history = [], setHistory, requests = [], setRequests, syncAllData, API_URL } = useApp() || {};
    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('upcoming');
    const [step, setStep] = useState(1);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    React.useEffect(() => {
        if (showDetailModal && selectedAppointment) {
            const updated = appointments.find(a => a.id === selectedAppointment.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAppointment)) {
                setSelectedAppointment(updated);
            }
        }
    }, [appointments, showDetailModal, selectedAppointment]);
    const [historyFilter, setHistoryFilter] = useState('all');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [requestType, setRequestType] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [preVisitSubmitting, setPreVisitSubmitting] = useState(false);
    const [preVisitFeedback, setPreVisitFeedback] = useState(null);
    const [bookingFeedback, setBookingFeedback] = useState(null);
    const [formData, setFormData] = useState({
        specialty: '',
        reason: '',
    });
    const isRTL = i18n.language === 'ar';
    const { width: winWidth } = useWindowDimensions();
    const narrow = winWidth < 400;
    const veryNarrow = winWidth < 360;
    const headerTitleFont = veryNarrow ? 22 : narrow ? 26 : 32;
    const tabLabelSize = narrow ? 12 : 14;
    const doctorNameFont = narrow ? 16 : 18;
    const formatDoctorDisplayName = (rawName) => {
        const s = String(rawName || '').trim();
        if (!s || s === 'notSpecified') return t('notSpecified');
        return s
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const sanitizeMotif = (rawMotif) =>
        String(rawMotif || '')
            .replace(/\[[^\]]+\]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

    const notifyUser = (title, message, kind = 'error') => {
        setBookingFeedback({ message, kind });
        if (Platform.OS !== 'web') {
            Alert.alert(title, message);
        }
    };

    const specialties = BOOKING_SPECIALTIES.map((spec) => ({
        ...spec,
        id: spec.value,
        name: t(spec.nameKey),
    }));

    const currentAppointments = activeTab === 'upcoming'
        ? appointments
        : activeTab === 'history'
            ? (historyFilter === 'all' ? history : history.filter(a => a.status === historyFilter))
            : requests;

    const handlePreVisitIntent = async (intent) => {
        if (!selectedAppointment) return;
        try {
            setPreVisitSubmitting(true);
            setPreVisitFeedback(null);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                if (Platform.OS !== 'web') Alert.alert(t('error'), 'Session expirée');
                return;
            }
            const res = await fetch(`${API_URL}/api/appointments/${selectedAppointment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ preVisitIntent: intent }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data.error || 'Erreur';
                notifyUser(t('error'), msg, 'error');
                return;
            }
            await syncAllData(token);

            if (intent === 'WANT_RESCHEDULE') {
                const updated = {
                    ...selectedAppointment,
                    status: 'en_attente',
                    requestType: 'reschedule',
                    needsPreVisitConfirmation: false
                };
                if (setAppointments) setAppointments((prev) => (prev || []).filter((a) => a.id !== updated.id));
                if (setRequests) setRequests((prev) => {
                    const next = (prev || []).filter((a) => a.id !== updated.id);
                    return [updated, ...next];
                });

                setShowDetailModal(false);
                setTimeout(() => setShowSuccessModal(true), 500);
            } else {
                notifyUser(
                    t('confirm'),
                    intent === 'WILL_ATTEND' ? t('preVisitThanks') : t('preVisitRescheduleHint'),
                    'success',
                );
                setPreVisitFeedback(intent === 'WILL_ATTEND' ? t('preVisitThanks') : t('preVisitRescheduleHint'));
                setSelectedAppointment((prev) => (
                    prev ? { ...prev, needsPreVisitConfirmation: false } : prev
                ));
            }
        } catch (e) {
            console.warn(e);
            notifyUser(t('error'), 'Impossible de contacter le serveur', 'error');
        } finally {
            setPreVisitSubmitting(false);
        }
    };

    const handleSwapChoice = async (choice) => {
        if (!selectedAppointment) return;
        try {
            setPreVisitSubmitting(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${API_URL}/api/appointments/${selectedAppointment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ swapChoice: choice }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                notifyUser(t('error'), data.error || 'Erreur', 'error');
                return;
            }
            await syncAllData(token);
            notifyUser(t('confirm'), choice === 'ACCEPT' ? t('requestConfirmed') : t('close'), 'success');
            setShowDetailModal(false);
        } catch (e) {
            console.warn(e);
            notifyUser(t('error'), 'Impossible de contacter le serveur', 'error');
        } finally {
            setPreVisitSubmitting(false);
        }
    };

    const handleConfirmRequest = async (typeOverride = null) => {
        if (!selectedAppointment) return;

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                if (Platform.OS === 'web') window.alert('Session expirée');
                return;
            }

            const effectiveRequestType = typeOverride || requestType;
            let newStatus = 'ANNULE';
            if (effectiveRequestType === 'reschedule') {
                newStatus = 'REPORTE';
            }

            setIsSubmitting(true);
            const res = await fetch(`${API_URL}/api/appointments/${selectedAppointment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    requestType: effectiveRequestType === 'reschedule' ? 'reschedule' : 'cancel'
                })
            });
            const responseData = await res.json().catch(() => ({}));

            if (!res.ok) {
                const errorMsg = responseData.error || 'Erreur lors de la mise à jour';
                if (Platform.OS === 'web') window.alert(errorMsg);
                Alert.alert(t('error'), errorMsg);
                return;
            }

            const updated = responseData?.appointment
                ? {
                    ...selectedAppointment,
                    ...responseData.appointment,
                    status: 'en_attente',
                    requestType: effectiveRequestType === 'reschedule' ? 'reschedule' : 'cancel'
                }
                : {
                    ...selectedAppointment,
                    status: 'en_attente',
                    requestType: effectiveRequestType === 'reschedule' ? 'reschedule' : 'cancel'
                };

            setAppointments((prev) => (prev || []).filter((a) => a.id !== updated.id));
            setHistory((prev) => (prev || []).filter((a) => a.id !== updated.id));
            setRequests((prev) => {
                const next = (prev || []).filter((a) => a.id !== updated.id);
                return [updated, ...next];
            });

            await syncAllData(token);

            setShowDetailModal(false);
            setTimeout(() => setShowSuccessModal(true), 500);
        } catch (error) {
            console.error('Error updating appointment:', error);
            Alert.alert(t('error'), 'Impossible de contacter le serveur');
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeDeleteHistory = async (id) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/api/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                Alert.alert(t('error'), 'Erreur lors de la suppression');
                return;
            }

            await syncAllData(token);
            setShowDetailModal(false);
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    };

    const handleDeleteHistory = (id) => {
        executeDeleteHistory(id);
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                await syncAllData(token);
            }
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setRefreshing(false);
        }
    }, [syncAllData]);

    const initiateRequest = async (type) => {
        setRequestType(type);
        await handleConfirmRequest(type);
    };

    const handleFileSelect = async () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,image/*,application/pdf';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    setSelectedFile({
                        name: file.name,
                        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                        file
                    });
                }
            };
            input.click();
            return;
        }
        try {
            const result = await getDocumentAsync({
                copyToCacheDirectory: true,
                type: ['application/pdf', 'image/*']
            });
            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;
            setSelectedFile({
                name: asset.name || 'document.pdf',
                uri: asset.uri,
                mimeType: asset.mimeType || 'application/pdf',
                size:
                    asset.size != null
                        ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
                        : ''
            });
        } catch (err) {
            console.error(err);
            notifyUser(t('error'), 'Impossible de sélectionner le fichier.', 'error');
        }
    };

    const handleConfirmBooking = async () => {
        if (isSubmitting) return;
        console.log(`[DEBUG] handleConfirmBooking started. API_URL: ${API_URL}`);
        setBookingFeedback(null);
        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                notifyUser(t('error'), 'Session expirée. Reconnectez-vous puis réessayez.', 'error');
                return;
            }

            let documentUrl = null;
            if (selectedFile && (selectedFile.file || selectedFile.uri)) {
                const fd = new FormData();
                if (selectedFile.file) {
                    fd.append('file', selectedFile.file);
                } else {
                    fd.append('file', {
                        uri: selectedFile.uri,
                        name: selectedFile.name || 'document.pdf',
                        type: selectedFile.mimeType || 'application/pdf'
                    });
                }
                const up = await fetch(`${API_URL}/api/appointments/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: fd
                });
                if (!up.ok) {
                    let uploadErr = 'Impossible d’envoyer le fichier.';
                    try {
                        const errData = await up.json();
                        uploadErr = errData.error || uploadErr;
                    } catch (_e) {
                    }
                    notifyUser(t('error'), uploadErr, 'error');
                    return;
                }
                const upData = await up.json();
                documentUrl = upData.documentUrl || null;
            }

            console.log(`[DEBUG] Sending POST to ${API_URL}/api/appointments`);
            const res = await fetch(`${API_URL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    specialty: formData.specialty,
                    reason: formData.reason,
                    hasDocuments: !!selectedFile,
                    documentName: selectedFile?.name || null,
                    documentUrl: documentUrl || undefined,
                    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    isUrgent: false
                })
            });

            console.log(`[DEBUG] POST response status: ${res.status}`);
            if (!res.ok) {
                let errorMsg = 'Erreur lors de la réservation';
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (_e) {
                }
                notifyUser(t('error'), errorMsg, 'error');
                return;
            }

            notifyUser('Succès', 'Votre demande de rendez-vous a été envoyée.', 'success');
            void syncAllData(token).catch((e) => console.warn('[appointments] sync après réservation', e));

            setView('list');
            setActiveTab('requests');
            setStep(1);
            setFormData({ specialty: '', reason: '' });
            setSelectedFile(null);

            setShowSuccessModal(true);
        } catch (error) {
            console.error('Booking error:', error);
            notifyUser(t('error'), `Erreur réseau: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    if (view === 'new') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{
                    headerShown: false
                }} />
                <HeaderSidebar activeScreen="appointments" />
                <View style={[styles.newAptContainer, { flex: 1 }]}>
                    <View style={styles.stepper}>
                        {[1, 2, 3].map((s) => (
                            <React.Fragment key={s}>
                                <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                                    <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                                </View>
                                {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
                            </React.Fragment>
                        ))}
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={[styles.cardTitle, isRTL && { textAlign: 'right' }]}>
                            {step === 1 ? t('chooseSpecialty') : step === 2 ? t('consultationReason') : t('medicalDocuments')}
                        </Text>

                        {step === 1 && (
                            <View style={styles.specialtiesCardGrid}>
                                {specialties.map((spec) => (
                                    <TouchableOpacity
                                        key={spec.id}
                                        style={[
                                            styles.specCard,
                                            formData.specialty === spec.id && styles.specCardActive,
                                            isRTL && { flexDirection: 'row-reverse' }
                                        ]}
                                        onPress={() => setFormData({ ...formData, specialty: spec.id })}
                                    >
                                        <View style={[styles.specIconCircle, formData.specialty === spec.id && styles.specIconCircleActive]}>
                                            {spec.iconType === 'MaterialCommunityIcons' ? (
                                                <MaterialCommunityIcons name={spec.icon} size={20} color={formData.specialty === spec.id ? '#fff' : patientPastel.primary} />
                                            ) : (
                                                <Feather name={spec.icon} size={20} color={formData.specialty === spec.id ? '#fff' : patientPastel.primary} />
                                            )}
                                        </View>
                                        <Text style={[styles.specCardText, formData.specialty === spec.id && styles.specCardTextActive]}>
                                            {spec.name}
                                        </Text>
                                        {formData.specialty === spec.id && (
                                            <Feather name="check-circle" size={18} color={patientPastel.primary} style={styles.specCheckIcon} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('reason')}</Text>
                                <TextInput
                                    style={[styles.textArea, isRTL && { textAlign: 'right' }]}
                                    placeholder={t('reasonPlaceholder')}
                                    multiline
                                    numberOfLines={6}
                                    value={formData.reason}
                                    onChangeText={(v) => setFormData({ ...formData, reason: v })}
                                />
                            </View>
                        )}

                        {step === 3 && (
                            <View>
                                <Text style={styles.cardSubtitle}>{t('optionalFilesDesc')}</Text>

                                <TouchableOpacity
                                    style={[styles.fileUploadContainer, selectedFile && styles.fileUploadActive]}
                                    onPress={handleFileSelect}
                                >
                                    <View style={[styles.fileIconCircleLarge, selectedFile && styles.fileIconCircleLargeActive]}>
                                        <Feather name={selectedFile ? 'check' : 'upload-cloud'} size={32} color={selectedFile ? '#fff' : patientPastel.primary} />
                                    </View>
                                    <Text style={styles.fileUploadTitle}>{selectedFile ? t('fileChosen') : t('selectFile')}</Text>
                                    <Text style={styles.fileUploadSubtitle}>{selectedFile ? selectedFile.name : t('optionalFiles')}</Text>
                                </TouchableOpacity>

                                {selectedFile && (
                                    <View style={styles.fileInfoCard}>
                                        <View style={styles.fileInfoMain}>
                                            <Feather name="file-text" size={24} color={patientPastel.primary} />
                                            <View style={styles.fileMeta}>
                                                <Text style={styles.fileNameInternal}>{selectedFile.name}</Text>
                                                <Text style={styles.fileSizeInternal}>{selectedFile.size}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileBtn}>
                                            <Feather name="trash-2" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.newAptFooter}>
                        {!!bookingFeedback && (
                            <View
                                style={[
                                    styles.bookingFeedbackBox,
                                    bookingFeedback.kind === 'success' ? styles.bookingFeedbackSuccess : styles.bookingFeedbackError
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.bookingFeedbackText,
                                        bookingFeedback.kind === 'success' ? styles.bookingFeedbackSuccessText : styles.bookingFeedbackErrorText
                                    ]}
                                >
                                    {bookingFeedback.message}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => step === 1 ? setView('list') : setStep(step - 1)}
                        >
                            <Text style={styles.backBtnText}>{t('back')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.nextBtn,
                                step === 3 && styles.nextBtnConfirmStrong,
                                (isSubmitting || (step === 1 && !formData.specialty || step === 2 && !formData.reason)) && styles.btnDisabled
                            ]}
                            onPress={() => step === 3 ? handleConfirmBooking() : setStep(step + 1)}
                            disabled={isSubmitting || (step === 1 && !formData.specialty || step === 2 && !formData.reason)}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.nextBtnText}>{step === 3 ? t('confirm') : t('continue')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />
            <HeaderSidebar activeScreen="appointments" />

            <View style={[styles.mainHeader, narrow && styles.mainHeaderCompact, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.mainHeaderTitleBlock, isRTL && { alignItems: 'flex-end' }]}>
                    <Text
                        style={[
                            styles.headerMainTitle,
                            { fontSize: headerTitleFont },
                            isRTL && { textAlign: 'right' }
                        ]}
                        numberOfLines={2}
                    >
                        {t('navAppointments')}
                    </Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('appointmentsDesc')}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setView('new')}
                    activeOpacity={0.9}
                    style={[styles.addAptBtnWrap, { borderRadius: 14, overflow: 'hidden', ...theme.shadows.sm }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('newAppointment')}
                >
                    <LinearGradient
                        colors={dashboardVibe.primaryCtaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.addAptBtn, veryNarrow && styles.addAptBtnIconOnly, isRTL && { flexDirection: 'row-reverse' }]}
                    >
                        <Text style={[styles.addAptBtnPlus, veryNarrow && { marginHorizontal: 0 }]}>+</Text>
                        {!veryNarrow && (
                            <Text
                                style={[styles.addAptBtnText, narrow && styles.addAptBtnTextCompact]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.65}
                            >
                                {t('newAppointment')}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={[styles.tabsWrapper, narrow && styles.tabsWrapperCompact, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.tabsBackground, narrow && styles.tabsBackgroundCompact, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity
                        style={[styles.tabPill, narrow && styles.tabPillCompact, activeTab === 'upcoming' && styles.tabPillActive]}
                        onPress={() => setActiveTab('upcoming')}
                    >
                        <Text
                            style={[
                                styles.tabPillText,
                                { fontSize: tabLabelSize },
                                activeTab === 'upcoming' && styles.tabPillTextActive
                            ]}
                            numberOfLines={2}
                        >
                            {t('upcoming')} ({appointments?.length || 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabPill, narrow && styles.tabPillCompact, activeTab === 'requests' && styles.tabPillActive]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text
                            style={[
                                styles.tabPillText,
                                { fontSize: tabLabelSize },
                                activeTab === 'requests' && styles.tabPillTextActive
                            ]}
                            numberOfLines={2}
                        >
                            {t('myRequests')} ({requests?.length || 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabPill, narrow && styles.tabPillCompact, activeTab === 'history' && styles.tabPillActive]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Text
                            style={[
                                styles.tabPillText,
                                { fontSize: tabLabelSize },
                                activeTab === 'history' && styles.tabPillTextActive
                            ]}
                            numberOfLines={2}
                        >
                            {t('history')} ({history?.length || 0})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'history' && (
                <View style={styles.historyFilterBar}>
                    <TouchableOpacity
                        style={[styles.filterChip, historyFilter === 'all' && styles.filterChipActive]}
                        onPress={() => setHistoryFilter('all')}
                    >
                        <Text style={[styles.filterChipText, historyFilter === 'all' && styles.filterChipTextActive]}>{t('all')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, historyFilter === 'termine' && styles.filterChipActive]}
                        onPress={() => setHistoryFilter('termine')}
                    >
                        <View style={[styles.filterDot, { backgroundColor: '#475569' }]} />
                        <Text style={[styles.filterChipText, historyFilter === 'termine' && styles.filterChipTextActive]}>{t('completed')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, historyFilter === 'annule' && styles.filterChipActive]}
                        onPress={() => setHistoryFilter('annule')}
                    >
                        <View style={[styles.filterDot, { backgroundColor: '#b91c1c' }]} />
                        <Text style={[styles.filterChipText, historyFilter === 'annule' && styles.filterChipTextActive]}>{t('cancelled')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {activeTab === 'history' && currentAppointments.length > 0 ? (
                <Text style={[styles.swipeDeleteHint, isRTL && { textAlign: 'right', paddingHorizontal: 20 }]}>
                    {t('swipeToDelete')}
                </Text>
            ) : null}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[patientPastel.primary]} />
                }
            >
                {currentAppointments.map((apt) => (
                    <SwipeDeleteRow
                        key={apt.id}
                        rowKey={String(apt.id)}
                        enabled={activeTab === 'history'}
                        style={{ marginBottom: 30 }}
                        cornerRadius={24}
                        accessibilityLabel={t('deleteFromHistory')}
                        onDelete={() => handleDeleteHistory(apt.id)}
                    >
                        <Pressable
                            style={styles.aptCard}
                            onPress={() => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                        >
                            <View style={[styles.aptTop, isRTL && { flexDirection: 'row-reverse' }]}>
                                {apt.isPlanned ? (
                                    <View style={styles.dateBox}>
                                        <Text style={styles.dateVal}>{apt.date}</Text>
                                        <Text style={styles.dateMonth}>{t(apt.month)}</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.dateBox, { backgroundColor: '#f1f5f9' }]}>
                                        <Feather name="clock" size={24} color="#94a3b8" />
                                    </View>
                                )}
                                <View style={[styles.aptMain, isRTL && { paddingLeft: 0, paddingRight: 18, alignItems: 'flex-end' }]}>
                                    <View style={[styles.aptHeaderRow, isRTL && { flexDirection: 'row-reverse', width: '100%' }]}>
                                        <View
                                            style={[
                                                styles.aptNameColumn,
                                                isRTL && { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 10 }
                                            ]}
                                        >
                                            <Text
                                                style={[styles.doctorName, { fontSize: doctorNameFont }]}
                                                numberOfLines={2}
                                            >
                                                {(apt.status === 'en_attente' || apt.status === 'reporte' || apt.status === 'annule' || apt.status === 'demande_annulation') ? (apt.doctor === 'Médecin à définir' ? t('notSpecified') : apt.doctor) : t(apt.doctor)}
                                            </Text>
                                            <Text style={styles.specTextSmall}>{t(specialtyToI18nKey(apt.specialty))}</Text>
                                        </View>
                                        {(() => {
                                            const config = {
                                                en_attente: { bg: '#e0f2fe', color: '#0369a1', labelKey: 'aptStatusEnAttente' },
                                                reporte: { bg: '#fef3c7', color: '#b45309', labelKey: 'aptStatusReporte' },
                                                demande_annulation: { bg: '#fee2e2', color: '#b91c1c', labelKey: 'aptStatusDemandeAnnulation' },
                                                annule: { bg: '#fee2e2', color: '#b91c1c', labelKey: 'aptStatusAnnule' },
                                                termine: { bg: '#f1f5f9', color: '#475569', labelKey: 'aptStatusTermine' },
                                                en_cours: { bg: '#ffedd5', color: '#c2410c', labelKey: 'aptStatusEnCours' },
                                                confirme: { bg: '#dcfce7', color: '#15803d', labelKey: 'aptStatusConfirme' }
                                            };
                                            const stat = (apt.status || '').toLowerCase().replace('é', 'e').replace('confirmed', 'confirme');
                                            const c = config[stat] || { bg: '#f1f5f9', color: '#64748b', labelKey: null };
                                            const statusLabel = c.labelKey ? t(c.labelKey) : t(apt.status);
                                            return (
                                                <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
                                                    <Text
                                                        style={[
                                                            styles.statusBadgeText,
                                                            { color: c.color },
                                                            narrow && styles.statusBadgeTextCompact
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {statusLabel}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                    </View>

                                    {activeTab === 'requests' && apt.requestType && (
                                        <View style={styles.requestInfoBox}>
                                            <Feather name={apt.requestType === 'reschedule' ? "calendar" : "x-circle"} size={14} color="#6366f1" />
                                            <Text style={styles.requestInfoText}>
                                                {apt.requestType === 'reschedule' ? t('reportRequest') : t('cancelRequest')}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={[styles.aptDetailsRow, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 15 }]}>
                                        <View style={[styles.detailItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                            <Feather name="clock" size={14} color="#64748b" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                            <Text style={styles.detailText}>
                                                {apt.isPlanned ? apt.time : t('dateNotDefined')}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.aptDetailsRow, isRTL && { flexDirection: 'row-reverse' }, { marginTop: 10, flexWrap: 'wrap' }]}>
                                        <View style={[styles.detailItem, isRTL && { flexDirection: 'row-reverse' }, { flexShrink: 1, marginRight: 10 }]}>
                                            <Feather name="map-pin" size={14} color="#64748b" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                            <Text style={styles.detailText} numberOfLines={1}>
                                                {apt.isPlanned ? t(apt.location) : t('locationNotDefined')}
                                            </Text>
                                        </View>
                                        {apt.isPlanned && (
                                            <View style={[styles.roomIndicator, isRTL && { flexDirection: 'row-reverse' }, { marginLeft: 0 }]}>
                                                <View style={styles.roomDot} />
                                                <Text style={styles.roomText}>{t('room')} {t(apt.room) || 'A301'}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={[styles.aptDivider, { marginVertical: 15 }]} />
                                    <View style={{ gap: 8 }}>
                                        <Text style={[styles.motifText, isRTL && { textAlign: 'right' }, { marginTop: 0 }]}>
                                            <Text style={{ fontWeight: '700' }}>{t('reason')}: </Text>
                                            {sanitizeMotif(apt.motif) || t('notSpecified')}
                                        </Text>
                                        <Text style={[styles.motifText, isRTL && { textAlign: 'right' }, { marginTop: 0 }]}>
                                            <Text style={{ fontWeight: '700' }}>{t('attachedDocuments')}</Text>
                                            {apt.hasDocuments ? t('attachedDocumentsYes') : t('attachedDocumentsNo')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    </SwipeDeleteRow>
                ))}
            </ScrollView>

            <Modal
                transparent
                visible={showDetailModal}
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={[styles.modalContent, { borderRadius: 24, width: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('appointmentDetails')}</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Text style={styles.closeBtn}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedAppointment && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailCardPaper}>
                                    <View style={[styles.detailDateCapsule, isRTL && { alignSelf: 'flex-end' }]}>
                                        <Text style={styles.detailDateMonth}>
                                            {selectedAppointment.isPlanned ? t(selectedAppointment.month) : t('dateNotDefined')}
                                        </Text>
                                        <Text style={styles.detailDateDay}>
                                            {selectedAppointment.isPlanned ? selectedAppointment.date : '--'}
                                        </Text>
                                        <Text style={styles.detailDateYear}>{selectedAppointment.year || '2026'}</Text>
                                    </View>

                                    <Text style={[styles.detailDoctorName, isRTL && { textAlign: 'right' }]}>
                                        {selectedAppointment.isPlanned
                                            ? formatDoctorDisplayName(selectedAppointment.doctor)
                                            : t('notSpecified')}
                                    </Text>
                                    <View style={[styles.detailSpecialtyPill, isRTL && { alignSelf: 'flex-end' }]}>
                                        <Text style={styles.detailSpecialtyPillText}>
                                            {selectedAppointment.isPlanned ? t(specialtyToI18nKey(selectedAppointment.specialty)) : t('notSpecified')}
                                        </Text>
                                    </View>

                                    <View style={[styles.detailInfoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                        <Feather name="clock" size={15} color="#4f46e5" />
                                        <Text style={[styles.detailInfoTitle, isRTL && { marginRight: 8, marginLeft: 0 }]}>
                                            {selectedAppointment.isPlanned ? selectedAppointment.time : t('dateNotDefined')}
                                        </Text>
                                    </View>

                                    <View style={styles.detailInfoBlock}>
                                        <Text style={[styles.detailInfoLabelCaps, isRTL && { textAlign: 'right' }]}>{t('location')}</Text>
                                        <Text style={[styles.detailInfoText, isRTL && { textAlign: 'right' }]}>
                                            {selectedAppointment.isPlanned ? t(selectedAppointment.location) : t('locationNotDefined')}
                                        </Text>
                                        <Text style={[styles.detailInfoSubtext, isRTL && { textAlign: 'right' }]}>
                                            {selectedAppointment.isPlanned ? `${t('room')} ${t(selectedAppointment.room) || 'A301'}` : '—'}
                                        </Text>
                                    </View>

                                    <View style={styles.detailInfoBlock}>
                                        <Text style={[styles.detailInfoLabelCaps, isRTL && { textAlign: 'right' }]}>
                                            {t('reason')}
                                        </Text>
                                        <Text style={[styles.detailInfoText, isRTL && { textAlign: 'right' }]}>
                                            {sanitizeMotif(selectedAppointment.motif) || t('notSpecified')}
                                        </Text>
                                        <Text style={[styles.detailInfoSubtext, isRTL && { textAlign: 'right' }]}>
                                            {t('attachedDocuments')}
                                            {selectedAppointment.hasDocuments ? t('attachedDocumentsYes') : t('attachedDocumentsNo')}
                                        </Text>
                                    </View>
                                    {selectedAppointment.earlierSlot && (
                                        <View style={[styles.preVisitCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                                            <Text style={[styles.preVisitText, { color: '#166534' }, isRTL && { textAlign: 'right' }]}>
                                                {t('earlierSlotAvailableBanner', {
                                                    time: (() => {
                                                        const d = new Date(selectedAppointment.earlierSlot.date);
                                                        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                    })()
                                                })}
                                            </Text>
                                        </View>
                                    )}

                                    {selectedAppointment.needsPreVisitConfirmation && !selectedAppointment.earlierSlot && (
                                        <View style={styles.preVisitCard}>
                                            <Text style={[styles.preVisitText, isRTL && { textAlign: 'right' }]}>
                                                {t('preVisitBanner')}
                                            </Text>
                                            {!!preVisitFeedback && (
                                                <Text style={[styles.preVisitSuccessText, isRTL && { textAlign: 'right' }]}>
                                                    {preVisitFeedback}
                                                </Text>
                                            )}
                                            <View style={[styles.preVisitStack, isRTL && { alignItems: 'flex-end' }]}>
                                                <TouchableOpacity
                                                    style={[styles.preVisitAction, styles.preVisitActionPrimary]}
                                                    disabled={preVisitSubmitting}
                                                    onPress={() => handlePreVisitIntent('WILL_ATTEND')}
                                                >
                                                    <View style={[styles.preVisitActionInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                                        <Feather name="check-circle" size={16} color="#fff" />
                                                        <Text style={styles.preVisitActionPrimaryText}>{t('preVisitWillAttend')}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.preVisitAction, styles.preVisitActionSecondary]}
                                                    disabled={preVisitSubmitting}
                                                    onPress={() => handlePreVisitIntent('WANT_RESCHEDULE')}
                                                >
                                                    <View style={[styles.preVisitActionInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                                        <Feather name="calendar" size={16} color="#1d4ed8" />
                                                        <Text style={styles.preVisitActionSecondaryText}>{t('preVisitWantReschedule')}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.preVisitAction, styles.preVisitActionDanger]}
                                                    disabled={preVisitSubmitting}
                                                    onPress={() => initiateRequest('cancel')}
                                                >
                                                    <View style={[styles.preVisitActionInner, isRTL && { flexDirection: 'row-reverse' }]}>
                                                        <Feather name="x-circle" size={16} color="#be123c" />
                                                        <Text style={styles.preVisitActionDangerText}>{t('cancelAppointment')}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'confirmé' || selectedAppointment.status === 'confirme' || selectedAppointment.status === 'en_cours') && selectedAppointment.status !== 'en_attente' && (selectedAppointment.earlierSlot || !selectedAppointment.needsPreVisitConfirmation) && (
                                        <View style={[styles.detailActionRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                            {selectedAppointment.earlierSlot ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[styles.detailSmallBtn, styles.detailEditBtn]}
                                                        onPress={() => handleSwapChoice('ACCEPT')}
                                                    >
                                                        <Text style={styles.detailSmallBtnText}>{t('acceptEarlierSlot')}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.detailSmallBtn, styles.detailCancelBtn]}
                                                        onPress={() => handleSwapChoice('DECLINE')}
                                                    >
                                                        <Text style={styles.detailSmallBtnDanger}>{t('keepOriginalSlot')}</Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <>
                                                    <TouchableOpacity
                                                        style={[styles.detailSmallBtn, styles.detailEditBtn]}
                                                        onPress={() => initiateRequest('reschedule')}
                                                    >
                                                        <Text style={styles.detailSmallBtnText}>{t('modify')}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.detailSmallBtn, styles.detailCancelBtn]}
                                                        onPress={() => initiateRequest('cancel')}
                                                    >
                                                        <Text style={styles.detailSmallBtnDanger}>{t('cancelRequest')}</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    )}

                                    {selectedAppointment.status === 'en_attente' && (
                                        <View style={[styles.detailActionRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                            <TouchableOpacity
                                                style={[styles.detailSmallBtn, styles.detailCancelBtn, { flex: 1 }]}
                                                onPress={() => initiateRequest('cancel')}
                                            >
                                                <Text style={styles.detailSmallBtnDanger}>{t('cancelRequest')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {(selectedAppointment.status === 'termine' ||
                                        selectedAppointment.status === 'annule') && (
                                            <TouchableOpacity
                                                style={[styles.detailDeleteHistoryBtn, isRTL && { flexDirection: 'row-reverse' }]}
                                                onPress={() => handleDeleteHistory(selectedAppointment.id)}
                                                activeOpacity={0.88}
                                            >
                                                <Feather name="trash-2" size={18} color="#b91c1c" />
                                                <Text style={styles.detailDeleteHistoryBtnText}>{t('deleteFromHistory')}</Text>
                                            </TouchableOpacity>
                                        )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={[styles.modalContent, styles.successModalContent]}>
                        <View style={styles.successIconContainer}>
                            <Feather name="check-circle" size={60} color="#22c55e" />
                        </View>
                        <Text style={styles.successTitle}>{t('requestSuccessTitle')}</Text>
                        <Text style={styles.successDesc}>{t('requestSuccessDesc')}</Text>
                        <TouchableOpacity
                            style={styles.successDoneBtn}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setActiveTab('requests');
                            }}
                        >
                            <Text style={styles.successDoneBtnText}>{t('back')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: patientPastel.pageBg,
    },
    mainHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 25,
        backgroundColor: patientPastel.pageBg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainHeaderCompact: {
        paddingHorizontal: 14,
    },
    mainHeaderTitleBlock: {
        flex: 1,
        minWidth: 0,
        paddingRight: 10,
    },
    addAptBtnWrap: {
        flexShrink: 0,
    },
    headerMainTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: patientPastel.textHeading,
    },
    headerMainSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    addAptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        maxWidth: 200,
    },
    addAptBtnIconOnly: {
        paddingHorizontal: 12,
        maxWidth: 56,
        minWidth: 48,
        justifyContent: 'center',
    },
    addAptBtnPlus: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginHorizontal: 6,
    },
    addAptBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        flexShrink: 1,
        minWidth: 0,
    },
    addAptBtnTextCompact: {
        fontSize: 12,
    },
    tabsWrapper: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tabsWrapperCompact: {
        paddingHorizontal: 12,
    },
    tabsBackground: {
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
    },
    tabsBackgroundCompact: {
        padding: 6,
    },
    tabPill: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 10,
        paddingHorizontal: 6,
        marginHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    tabPillCompact: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginHorizontal: 1,
    },
    tabPillActive: {
        backgroundColor: '#fff',
        ...theme.shadows.sm,
    },
    tabPillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        textAlign: 'center',
    },
    tabPillTextActive: {
        color: patientPastel.textHeading,
    },
    swipeDeleteHint: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 24,
        marginBottom: 10,
        lineHeight: 17,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 110,
    },
    aptCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    aptTop: {
        flexDirection: 'row',
    },
    dateBox: {
        backgroundColor: '#eff6ff',
        borderRadius: 18,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 70,
        height: 70,
    },
    dateVal: {
        fontSize: 26,
        fontWeight: '900',
        color: patientPastel.primary,
    },
    dateMonth: {
        fontSize: 14,
        fontWeight: '700',
        color: '#60a5fa',
        textTransform: 'lowercase',
    },
    aptMain: {
        flex: 1,
        paddingLeft: 18,
    },
    aptHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 8,
    },
    aptNameColumn: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
    },
    doctorName: {
        fontSize: 18,
        fontWeight: '800',
        color: patientPastel.textHeading,
        marginBottom: 2,
    },
    specTextSmall: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    statusBadge: {
        flexShrink: 0,
        alignSelf: 'flex-start',
        maxWidth: '46%',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    statusBadgeTextCompact: {
        fontSize: 10,
        paddingHorizontal: 0,
    },
    aptDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    roomIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
        backgroundColor: patientPastel.pageBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roomDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#94a3b8',
        marginRight: 6,
    },
    roomText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '700',
    },
    aptDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    motifText: {
        fontSize: 15,
        color: '#64748b',
        lineHeight: 22,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        maxHeight: '85%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: patientPastel.textHeading,
    },
    closeBtn: {
        fontSize: 28,
        color: '#64748b',
    },
    modalBody: {
        padding: 25,
    },
    detailCardPaper: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: '#eef2ff',
        ...theme.shadows.sm,
    },
    detailDateCapsule: {
        alignSelf: 'flex-start',
        minWidth: 112,
        borderRadius: 18,
        backgroundColor: '#818cf8',
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 14,
        alignItems: 'center',
    },
    detailDateMonth: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    detailDateDay: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 34,
    },
    detailDateYear: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '700',
    },
    detailDoctorName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1f2937',
        marginBottom: 8,
    },
    detailSpecialtyPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: '#f1f5f9',
        marginBottom: 14,
    },
    detailSpecialtyPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
    },
    detailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailInfoTitle: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '800',
        color: '#312e81',
    },
    detailInfoBlock: {
        borderTopWidth: 1,
        borderTopColor: '#eef2ff',
        paddingTop: 10,
        marginTop: 6,
    },
    detailInfoLabelCaps: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detailInfoText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    detailInfoSubtext: {
        marginTop: 4,
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    detailActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
        marginBottom: 4,
    },
    detailSmallBtn: {
        flex: 1,
        borderRadius: 14,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailEditBtn: {
        backgroundColor: '#f1f5f9',
    },
    detailCancelBtn: {
        backgroundColor: '#fdf2f8',
    },
    detailSmallBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#475569',
    },
    detailSmallBtnDanger: {
        fontSize: 14,
        fontWeight: '800',
        color: '#be123c',
    },
    detailDeleteHistoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#fecaca',
        backgroundColor: '#fff',
    },
    detailDeleteHistoryBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#b91c1c',
    },
    heroCard: {
        backgroundColor: patientPastel.primaryDeep,
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 5,
    },
    heroValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2,
    },
    heroTime: {
        color: patientPastel.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    preVisitCard: {
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    preVisitText: {
        fontSize: 13,
        color: '#1e3a8a',
        lineHeight: 19,
        marginBottom: 12,
        fontWeight: '600',
    },
    preVisitSuccessText: {
        fontSize: 12,
        color: '#166534',
        fontWeight: '700',
        marginBottom: 10,
        lineHeight: 18,
    },
    preVisitStack: {
        gap: 10,
    },
    preVisitAction: {
        width: '100%',
        minHeight: 48,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    preVisitActionInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    preVisitActionPrimary: {
        backgroundColor: patientPastel.primaryDeep,
    },
    preVisitActionPrimaryText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
        lineHeight: 16,
        textAlign: 'center',
    },
    preVisitActionSecondary: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#93c5fd',
    },
    preVisitActionSecondaryText: {
        color: '#1d4ed8',
        fontWeight: '800',
        fontSize: 13,
        lineHeight: 16,
        textAlign: 'center',
    },
    preVisitActionDanger: {
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    preVisitActionDangerText: {
        color: '#be123c',
        fontWeight: '800',
        fontSize: 13,
        lineHeight: 16,
        textAlign: 'center',
    },
    detailItemModal: {
        marginBottom: 20,
    },
    detailLabel: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 5,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: patientPastel.textHeading,
    },
    detailSub: {
        fontSize: 14,
        color: '#64748b',
    },
    modalActions: {
        marginTop: 10,
        gap: 12,
    },
    actionBtn: {
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    rescheduleBtn: {
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
    },
    cancelBtnModal: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#fee2e2',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: patientPastel.textHeading,
    },
    actionBtnTextDanger: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ef4444',
    },
    newAptContainer: {
        backgroundColor: patientPastel.pageBg,
        flex: 1,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    stepCircleActive: {
        backgroundColor: patientPastel.primary,
        borderColor: patientPastel.primary,
    },
    stepNum: {
        fontSize: 14,
        fontWeight: '800',
        color: '#94a3b8',
    },
    stepNumActive: {
        color: '#fff',
    },
    stepLine: {
        width: 30,
        height: 2,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: patientPastel.primary,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: patientPastel.textHeading,
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 24,
    },
    specialtiesCardGrid: {
        gap: 12,
    },
    specCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    specCardActive: {
        borderColor: patientPastel.primary,
        backgroundColor: '#eff6ff',
    },
    specIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    specIconCircleActive: {
        backgroundColor: patientPastel.primary,
    },
    specCardText: {
        fontSize: 16,
        fontWeight: '700',
        color: patientPastel.textHeading,
        flex: 1,
    },
    specCardTextActive: {
        color: patientPastel.primary,
    },
    specCheckIcon: {
        marginLeft: 10,
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        fontSize: 16,
        textAlignVertical: 'top',
        borderWidth: 2,
        borderColor: '#f1f5f9',
        minHeight: 150,
    },
    uploadBox: {
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        backgroundColor: patientPastel.pageBg,
    },
    uploadText: {
        fontSize: 15,
        fontWeight: '700',
        color: patientPastel.textHeading,
        marginBottom: 5,
    },
    uploadSubtext: {
        fontSize: 13,
        color: '#64748b',
    },
    newAptFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 90 : 80,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 15,
    },
    bookingFeedbackBox: {
        width: '100%',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
    },
    bookingFeedbackText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    bookingFeedbackError: {
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
    },
    bookingFeedbackErrorText: {
        color: '#be123c',
    },
    bookingFeedbackSuccess: {
        backgroundColor: '#ecfdf3',
        borderColor: '#bbf7d0',
    },
    bookingFeedbackSuccessText: {
        color: '#166534',
    },
    backBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    backBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    nextBtn: {
        flex: 2,
        backgroundColor: patientPastel.primaryDeep,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    nextBtnConfirmStrong: {
        backgroundColor: '#4338ca',
        borderWidth: 1,
        borderColor: '#312e81',
        ...theme.shadows.md,
    },
    nextBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    btnDisabled: {
        backgroundColor: '#cbd5e1',
    },
    confirmModalContent: {
        width: '90%',
        maxHeight: '70%',
        borderRadius: 24,
        paddingBottom: 25,
    },
    confirmText: {
        fontSize: 16,
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    confirmActions: {
        flexDirection: 'column',
        gap: 10,
        marginTop: 20,
    },
    confirmBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtn: {
        backgroundColor: patientPastel.primary,
        order: -1,
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    confirmBtnTextMain: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    fileIconCircleLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    fileIconCircleLargeActive: {
        backgroundColor: '#22c55e',
    },
    fileInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        ...theme.shadows.sm,
    },
    fileInfoMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileMeta: {
        marginLeft: 15,
    },
    fileNameInternal: {
        fontSize: 15,
        fontWeight: '700',
        color: patientPastel.textHeading,
    },
    fileSizeInternal: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    removeFileBtn: {
        padding: 10,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
    },
    statusPending: {
        backgroundColor: '#fef3c7',
    },
    requestTypeBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#e0e7ff',
        borderRadius: 10,
        padding: 4,
        zIndex: 1,
    },
    historyFilterBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: patientPastel.pageBg,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    filterChipText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: patientPastel.primary,
        fontWeight: '600',
    },
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    requestDetails: {
        marginTop: 10,
        backgroundColor: patientPastel.pageBg,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fileUploadContainer: {
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: patientPastel.pageBg,
        marginTop: 20,
    },
    fileUploadActive: {
        borderColor: patientPastel.primary,
        backgroundColor: '#eff6ff',
    },
    fileIconContainer: {
        marginBottom: 16,
    },
    fileUploadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    fileUploadSubtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    selectedFileBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 10,
        marginTop: 15,
        width: '100%',
    },
    selectedFileName: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#334155',
    },
    requestInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    requestInfoText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
        marginLeft: 4,
    },
    successModalContent: {
        width: '85%',
        padding: 30,
        borderRadius: 30,
        alignItems: 'center',
    },
    successIconContainer: {
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: patientPastel.textHeading,
        marginBottom: 10,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    successDoneBtn: {
        backgroundColor: patientPastel.primaryDeep,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
    },
    successDoneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default Appointments;
