import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './AppContext';
import HeaderSidebar from './components/HeaderSidebar';

const { width } = Dimensions.get('window');

const Appointments = () => {
    const { t, i18n } = useTranslation();
    const { appointments = [], setAppointments, history = [], setHistory, requests = [], setRequests } = useApp() || {};
    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('upcoming');
    const [step, setStep] = useState(1);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showConfirmRequestModal, setShowConfirmRequestModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [requestType, setRequestType] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [formData, setFormData] = useState({
        specialty: '',
        reason: '',
    });
    const isRTL = i18n.language === 'ar';

    const specialties = [
        { id: 'cardio', name: t('cardiology'), icon: 'activity' },
        { id: 'dermato', name: t('dermatology'), icon: 'sun' },
        { id: 'general', name: t('generalPractitioner'), icon: 'user' },
        { id: 'gyneco', name: t('gynecology'), icon: 'smile' },
        { id: 'ophtalmo', name: t('ophthalmology'), icon: 'eye' },
        { id: 'ortho', name: t('orthopedics'), icon: 'git-branch' },
        { id: 'pediatre', name: t('pediatrics'), icon: 'users' },
        { id: 'rhumato', name: t('rheumatology'), icon: 'anchor' },
        { id: 'urologie', name: t('urology'), icon: 'droplet' },
    ];

    const currentAppointments = activeTab === 'upcoming'
        ? appointments.filter(a => a.status === 'confirmed' || a.status === 'confirmé')
        : activeTab === 'history'
            ? history
            : requests;

    const handleConfirmRequest = () => {
        if (!selectedAppointment) return;

        const newRequest = {
            ...selectedAppointment,
            requestId: Date.now(),
            requestType: requestType,
            requestDate: new Date().toLocaleDateString(),
            requestStatus: 'pending',
            status: 'en_attente',
            attachedFile: selectedFile ? selectedFile.name : null
        };

        setRequests([...requests, newRequest]);
        setAppointments(appointments.filter(a => a.id !== selectedAppointment.id));

        setShowConfirmRequestModal(false);
        setShowDetailModal(false);
        setTimeout(() => setShowSuccessModal(true), 500);
    };

    const initiateRequest = (type) => {
        setRequestType(type);
        setShowConfirmRequestModal(true);
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

    const handleConfirmBooking = () => {
        const newRequest = {
            id: Date.now(),
            doctor: t('pending'),
            specialty: formData.specialty,
            date: "",
            month: "",
            time: t('pendingConfirmation'),
            location: t('pendingConfirmation'),
            motif: formData.reason,
            status: "en_attente"
        };
        setRequests([...requests, newRequest]);
        setView('list');
        setActiveTab('requests');
        setStep(1);
        setFormData({ specialty: '', reason: '' });
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
                                            formData.specialty === spec.name && styles.specCardActive,
                                            isRTL && { flexDirection: 'row-reverse' }
                                        ]}
                                        onPress={() => setFormData({ ...formData, specialty: spec.name })}
                                    >
                                        <View style={[styles.specIconCircle, formData.specialty === spec.name && styles.specIconCircleActive]}>
                                            <Feather name={spec.icon} size={20} color={formData.specialty === spec.name ? "#fff" : "#2563eb"} />
                                        </View>
                                        <Text style={[styles.specCardText, formData.specialty === spec.name && styles.specCardTextActive]}>
                                            {spec.name}
                                        </Text>
                                        {formData.specialty === spec.name && (
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
                                <Text style={styles.cardTitle}>{t('medicalDocuments')}</Text>
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
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => step === 1 ? setView('list') : setStep(step - 1)}
                        >
                            <Text style={styles.backBtnText}>{t('back')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.nextBtn, (step === 1 && !formData.specialty || step === 2 && !formData.reason) && styles.btnDisabled]}
                            onPress={() => step === 3 ? handleConfirmBooking() : setStep(step + 1)}
                            disabled={step === 1 && !formData.specialty || step === 2 && !formData.reason}
                        >
                            <Text style={styles.nextBtnText}>{step === 3 ? t('confirm') : t('continue')}</Text>
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

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {currentAppointments.map((apt) => (
                    <TouchableOpacity
                        key={apt.id}
                        style={styles.aptCard}
                        onPress={() => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                    >
                        <View style={[styles.aptTop, isRTL && { flexDirection: 'row-reverse' }]}>
                            {apt.status !== 'en_attente' && (
                                <View style={styles.dateBox}>
                                    <Text style={styles.dateVal}>{apt.date}</Text>
                                    <Text style={styles.dateMonth}>{t(apt.month)}</Text>
                                </View>
                            )}
                            <View style={[styles.aptMain, isRTL && { paddingLeft: 0, paddingRight: 18, alignItems: 'flex-end' }]}>
                                <View style={[styles.aptHeaderRow, isRTL && { flexDirection: 'row-reverse', width: '100%' }]}>
                                    <View style={isRTL && { alignItems: 'flex-end' }}>
                                        <Text style={styles.doctorName}>{t(apt.doctor)}</Text>
                                        <Text style={styles.specTextSmall}>{t(apt.specialty)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, {
                                        backgroundColor: activeTab === 'requests'
                                            ? '#fef3c7'
                                            : apt.status === 'confirmed' || apt.status === 'confirmé' ? '#dcfce7' : '#f1f5f9'
                                    }]}>
                                        <Text style={[styles.statusBadgeText, {
                                            color: activeTab === 'requests'
                                                ? '#b45309'
                                                : apt.status === 'confirmed' || apt.status === 'confirmé' ? '#15803d' : '#64748b'
                                        }]}>
                                            {activeTab === 'requests' ? t('en_attente') : t(apt.status)}
                                        </Text>
                                    </View>
                                </View>

                                {activeTab === 'requests' && (
                                    <View style={styles.requestInfoBox}>
                                        <Feather name={apt.requestType === 'reschedule' ? "calendar" : "x-circle"} size={14} color="#6366f1" />
                                        <Text style={styles.requestInfoText}>
                                            {apt.requestType === 'reschedule' ? t('reportRequest') : t('cancelRequest')}
                                        </Text>
                                    </View>
                                )}

                                <View style={[styles.aptDetailsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <View style={[styles.detailItem, isRTL && { flexDirection: 'row-reverse' }]}>
                                        <Feather name="clock" size={14} color="#64748b" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                        <Text style={styles.detailText}>{apt.time}</Text>
                                    </View>
                                </View>

                                <View style={[styles.aptDetailsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <View style={[styles.detailItem, isRTL && { flexDirection: 'row-reverse', flex: 1 }]}>
                                        <Feather name="map-pin" size={14} color="#64748b" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                                        <Text style={styles.detailText} numberOfLines={1}>
                                            {apt.location}
                                        </Text>
                                    </View>
                                    <View style={[styles.roomIndicator, isRTL && { flexDirection: 'row-reverse' }]}>
                                        <View style={styles.roomDot} />
                                        <Text style={styles.roomText}>{t('room')} {apt.room || 'A301'}</Text>
                                    </View>
                                </View>

                                <View style={styles.aptDivider} />
                                <Text style={[styles.motifText, isRTL && { textAlign: 'right' }]}>
                                    <Text style={{ fontWeight: '700' }}>{t('reason')}: </Text>{apt.motif}
                                </Text>
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
                                    <Text style={styles.heroValue}>
                                        {selectedAppointment.date ? `${selectedAppointment.date} ${t(selectedAppointment.month)}` : t('dateNotDefined')} {selectedAppointment.year || '2026'}
                                    </Text>
                                    <Text style={styles.heroTime}>{selectedAppointment.time}</Text>
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('practitioner')}</Text>
                                    <Text style={styles.detailValue}>{t(selectedAppointment.doctor)}</Text>
                                    <Text style={styles.detailSub}>{t(selectedAppointment.specialty)}</Text>
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('location')}</Text>
                                    <Text style={styles.detailValue}>{selectedAppointment.location}</Text>
                                </View>

                                <View style={styles.detailItemModal}>
                                    <Text style={styles.detailLabel}>{t('reason')}</Text>
                                    <Text style={styles.detailValue}>{selectedAppointment.motif || t('notSpecified')}</Text>
                                </View>

                                {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'confirmé') && selectedAppointment.status !== 'en_attente' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.rescheduleBtn]}
                                            onPress={() => initiateRequest('reschedule')}
                                        >
                                            <Text style={styles.actionBtnText}>{t('reschedule')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtnModal]}
                                            onPress={() => initiateRequest('cancel')}
                                        >
                                            <Text style={styles.actionBtnTextDanger}>{t('cancelAppointment')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showConfirmRequestModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmRequestModal(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={[styles.modalContent, styles.confirmModalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {requestType === 'reschedule' ? t('reportRequest') : t('cancelRequest')}
                            </Text>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.confirmText}>{t('requestConfirmation')}</Text>
                            {requestType === 'reschedule' && (
                                <View style={styles.fileUploadSection}>
                                    <Text style={styles.detailLabel}>{t('motif')}</Text>
                                    <TextInput
                                        style={styles.textArea}
                                        placeholder={t('reason')}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                            )}
                            <View style={styles.confirmActions}>
                                <TouchableOpacity
                                    style={[styles.confirmBtn, styles.cancelBtn]}
                                    onPress={() => setShowConfirmRequestModal(false)}
                                >
                                    <Text style={styles.confirmBtnText}>{t('back')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmBtn, styles.submitBtn]}
                                    onPress={handleConfirmRequest}
                                >
                                    <Text style={styles.confirmBtnTextMain}>{t('confirmRequest')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
        marginBottom: 20,
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
        fontSize: 24,
        fontWeight: '900',
        color: '#2563eb',
    },
    dateMonth: {
        fontSize: 13,
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
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 11,
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
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
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
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 15,
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
