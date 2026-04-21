import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';
import AsyncStorage from './utils/storage';

const { width } = Dimensions.get('window');

const Appointments = () => {
    const { t, i18n } = useTranslation();
    const { appointments = [], setAppointments, history = [], setHistory, requests = [], setRequests, syncAllData, API_URL } = useApp() || {};
    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('upcoming');
    const [step, setStep] = useState(1);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [historyFilter, setHistoryFilter] = useState('all');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [requestType, setRequestType] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingFeedback, setBookingFeedback] = useState(null);
    const [formData, setFormData] = useState({
        specialty: '',
        reason: '',
    });
    const isRTL = i18n.language === 'ar';

    const notifyUser = (title, message, kind = 'error') => {
        setBookingFeedback({ message, kind });
        if (Platform.OS !== 'web') {
            Alert.alert(title, message);
        }
    };

    const specialties = [
        { id: 'cardiology', name: t('cardiology'), icon: 'activity' },
        { id: 'dermatology', name: t('dermatology'), icon: 'sun' },
        { id: 'generalPractitioner', name: t('generalPractitioner'), icon: 'user' },
        { id: 'gynecology', name: t('gynecology'), icon: 'baby-face-outline', iconType: 'MaterialCommunityIcons' },
        { id: 'ophthalmology', name: t('ophthalmology'), icon: 'eye' },
        { id: 'orthopedics', name: t('orthopedics'), icon: 'git-branch' },
        { id: 'pediatrics', name: t('pediatrics'), icon: 'users' },
        { id: 'rheumatology', name: t('rheumatology'), icon: 'anchor' },
        { id: 'urology', name: t('urology'), icon: 'droplet' },
    ];

    const currentAppointments = activeTab === 'upcoming'
        ? appointments
        : activeTab === 'history'
            ? (historyFilter === 'all' ? history : history.filter(a => a.status === historyFilter))
            : requests;

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

            const res = await fetch(`${API_URL}/api/appointments/${selectedAppointment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const errorMsg = errorData.error || 'Erreur lors de la mise à jour';
                if (Platform.OS === 'web') window.alert(errorMsg);
                Alert.alert(t('error'), errorMsg);
                return;
            }

            await syncAllData(token);

            setShowDetailModal(false);
            setTimeout(() => setShowSuccessModal(true), 500);
        } catch (error) {
            console.error('Error updating appointment:', error);
            Alert.alert(t('error'), 'Impossible de contacter le serveur');
        }
    };

    const handleDeleteHistory = async (id) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/api/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
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

    const initiateRequest = (type) => {
        setRequestType(type);
        handleConfirmRequest(type);
    };

    const handleFileSelect = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    setSelectedFile({
                        name: file.name,
                        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                    });
                }
            };
            input.click();
        } else {

            const mockFile = { name: `document_${Date.now()}.pdf`, size: '1.2 MB' };
            setSelectedFile(mockFile);
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
                    // Keep fallback message when backend response is not JSON
                }
                notifyUser(t('error'), errorMsg, 'error');
                return;
            }

            notifyUser('Succès', 'Votre demande de rendez-vous a été envoyée.', 'success');
            await syncAllData(token);

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
                                                <MaterialCommunityIcons name={spec.icon} size={20} color={formData.specialty === spec.id ? "#fff" : "#2563eb"} />
                                            ) : (
                                                <Feather name={spec.icon} size={20} color={formData.specialty === spec.id ? "#fff" : "#2563eb"} />
                                            )}
                                        </View>
                                        <Text style={[styles.specCardText, formData.specialty === spec.id && styles.specCardTextActive]}>
                                            {spec.name}
                                        </Text>
                                        {formData.specialty === spec.id && (
                                            <Feather name="check-circle" size={18} color="#2563eb" style={styles.specCheckIcon} />
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
                                        <Feather name={selectedFile ? "check" : "upload-cloud"} size={32} color={selectedFile ? "#fff" : "#2563eb"} />
                                    </View>
                                    <Text style={styles.fileUploadTitle}>{selectedFile ? t('fileChosen') : t('selectFile')}</Text>
                                    <Text style={styles.fileUploadSubtitle}>{selectedFile ? selectedFile.name : t('optionalFiles')}</Text>
                                </TouchableOpacity>

                                {selectedFile && (
                                    <View style={styles.fileInfoCard}>
                                        <View style={styles.fileInfoMain}>
                                            <Feather name="file-text" size={24} color="#2563eb" />
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
                            style={[styles.nextBtn, (isSubmitting || (step === 1 && !formData.specialty || step === 2 && !formData.reason)) && styles.btnDisabled]}
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

            <View style={[styles.mainHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerMainTitle, isRTL && { textAlign: 'right' }]}>{t('navAppointments')}</Text>
                    <Text style={[styles.headerMainSubtitle, isRTL && { textAlign: 'right' }]}>{t('appointmentsDesc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setView('new')} style={[styles.addAptBtn, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginHorizontal: 8 }}>+</Text>
                    <Text style={styles.addAptBtnText}>{t('newAppointment')}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.tabsWrapper, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.tabsBackground, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity
                        style={[styles.tabPill, activeTab === 'upcoming' && styles.tabPillActive]}
                        onPress={() => setActiveTab('upcoming')}
                    >
                        <Text style={[styles.tabPillText, activeTab === 'upcoming' && styles.tabPillTextActive]}>
                            {t('upcoming')} ({appointments?.length || 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabPill, activeTab === 'requests' && styles.tabPillActive]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text style={[styles.tabPillText, activeTab === 'requests' && styles.tabPillTextActive]}>
                            {t('myRequests')} ({requests?.length || 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Text style={[styles.tabPillText, activeTab === 'history' && styles.tabPillTextActive]}>
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

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
                }
            >
                {currentAppointments.map((apt) => (
                    <TouchableOpacity
                        key={apt.id}
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
                                    <View style={[{ flex: 1, paddingRight: 10 }, isRTL && { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 10 }]}>
                                        <Text style={styles.doctorName}>{(apt.status === 'en_attente' || apt.status === 'reporte' || apt.status === 'annule' || apt.status === 'demande_annulation') ? (apt.doctor === 'Médecin à définir' ? t('notSpecified') : apt.doctor) : t(apt.doctor)}</Text>
                                        <Text style={styles.specTextSmall}>{t(apt.specialty)}</Text>
                                    </View>
                                    {(() => {
                                        const config = {
                                            en_attente: { bg: '#e0f2fe', color: '#0369a1', label: 'Nouvelle demande' },
                                            reporte: { bg: '#fef3c7', color: '#b45309', label: 'Demande de report' },
                                            demande_annulation: { bg: '#fee2e2', color: '#b91c1c', label: 'Demande annulation' },
                                            annule: { bg: '#fee2e2', color: '#b91c1c', label: 'Annulé' },
                                            termine: { bg: '#f1f5f9', color: '#475569', label: 'Terminé' },
                                            en_cours: { bg: '#ffedd5', color: '#c2410c', label: 'En cours' },
                                            confirme: { bg: '#dcfce7', color: '#15803d', label: 'Confirmé' }
                                        };
                                        const stat = (apt.status || '').toLowerCase().replace('é', 'e').replace('confirmed', 'confirme');
                                        const c = config[stat] || { bg: '#f1f5f9', color: '#64748b', label: t(apt.status) };
                                        return (
                                            <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
                                                <Text style={[styles.statusBadgeText, { color: c.color }]}>{c.label}</Text>
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
                                        <Text style={{ fontWeight: '700' }}>{t('reason')}: </Text>{apt.motif}
                                    </Text>
                                    <Text style={[styles.motifText, isRTL && { textAlign: 'right' }, { marginTop: 0 }]}>
                                        <Text style={{ fontWeight: '700' }}>Documents joints: </Text>{apt.hasDocuments ? "Oui 📎" : "Non"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
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
                                <View style={styles.heroCard}>
                                    <Text style={styles.heroLabel}>{t('dateAndTime')}</Text>
                                    {selectedAppointment.status === 'en_attente' || selectedAppointment.status === 'reporte' || selectedAppointment.status === 'annule' || selectedAppointment.status === 'demande_annulation' ? (
                                        <Text style={styles.heroValue}>{t('dateNotDefined')}</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.heroValue}>
                                                {selectedAppointment.date ? `${selectedAppointment.date} ${t(selectedAppointment.month)}` : t('dateNotDefined')} {selectedAppointment.year || '2026'}
                                            </Text>
                                            <Text style={styles.heroTime}>{selectedAppointment.time}</Text>
                                        </>
                                    )}
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('practitioner')}</Text>
                                    <Text style={styles.detailValue}>{selectedAppointment.isPlanned ? t(selectedAppointment.doctor) : t('notSpecified')}</Text>
                                    <Text style={styles.detailSub}>{selectedAppointment.isPlanned ? t(selectedAppointment.specialty) : ''}</Text>
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('location')}</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedAppointment.isPlanned ? t(selectedAppointment.location) : t('locationNotDefined')}
                                    </Text>
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('reason')}</Text>
                                    <Text style={styles.detailValue}>{selectedAppointment.motif || t('notSpecified')}</Text>
                                </View>

                                {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'confirmé' || selectedAppointment.status === 'confirme' || selectedAppointment.status === 'en_cours') && selectedAppointment.status !== 'en_attente' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.rescheduleBtn]}
                                            onPress={() => initiateRequest('reschedule')}
                                        >
                                            <Text style={styles.actionBtnText}>{t('reportRequest')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtnModal]}
                                            onPress={() => initiateRequest('cancel')}
                                        >
                                            <Text style={styles.actionBtnTextDanger}>{t('cancelRequest')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {selectedAppointment.status === 'en_attente' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtnModal]}
                                            onPress={() => initiateRequest('cancel')}
                                        >
                                            <Text style={styles.actionBtnTextDanger}>{t('cancelRequest')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeTab === 'history' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtnModal]}
                                            onPress={() => handleDeleteHistory(selectedAppointment.id)}
                                        >
                                            <Text style={styles.actionBtnTextDanger}>{t('delete')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
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
        backgroundColor: '#f8fafc',
    },
    mainHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 25,
        backgroundColor: '#f8fafc',
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerMainTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
    },
    headerMainSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    addAptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        ...theme.shadows.sm,
    },
    addAptBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    tabsWrapper: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tabsBackground: {
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
    },
    tabPill: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        alignItems: 'center',
        borderRadius: 12,
    },
    tabPillActive: {
        backgroundColor: '#fff',
        ...theme.shadows.sm,
    },
    tabPillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    tabPillTextActive: {
        color: '#0f172a',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 0,
    },
    aptCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
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
        color: '#2563eb',
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
    },
    doctorName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 2,
    },
    specTextSmall: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '800',
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
        backgroundColor: '#f8fafc',
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
        color: '#0f172a',
    },
    closeBtn: {
        fontSize: 28,
        color: '#64748b',
    },
    modalBody: {
        padding: 25,
    },
    heroCard: {
        backgroundColor: '#0f172a',
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
        color: '#2563eb',
        fontSize: 16,
        fontWeight: '700',
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
        color: '#0f172a',
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
        color: '#0f172a',
    },
    actionBtnTextDanger: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ef4444',
    },
    newAptContainer: {
        backgroundColor: '#f8fafc',
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
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
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
        backgroundColor: '#2563eb',
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
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
        borderColor: '#2563eb',
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
        backgroundColor: '#2563eb',
    },
    specCardText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    specCardTextActive: {
        color: '#2563eb',
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
        backgroundColor: '#f8fafc',
    },
    uploadText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
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
        backgroundColor: '#0f172a',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
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
        backgroundColor: '#2563eb',
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
        color: '#0f172a',
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
        backgroundColor: '#fff',
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
        color: '#2563eb',
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
        backgroundColor: '#f8fafc',
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
        backgroundColor: '#f8fafc',
        marginTop: 20,
    },
    fileUploadActive: {
        borderColor: '#2563eb',
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
        color: '#0f172a',
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
        backgroundColor: '#0f172a',
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
