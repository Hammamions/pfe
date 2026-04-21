import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const CustomCalendar = ({ visible, onClose, onSelect, initialDate, isRTL, t }) => {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : today);
    const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'

    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleSelectDay = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        onSelect(formattedDate);
        onClose();
    };

    const handleSelectMonth = (index) => {
        setCurrentDate(new Date(currentDate.getFullYear(), index, 1));
        setViewMode('days');
    };

    const handleSelectYear = (year) => {
        setCurrentDate(new Date(year, currentDate.getMonth(), 1));
        setViewMode('days');
    };

    const renderDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Padding for the first week
        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateAtCell = new Date(year, month, i);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
            const isSelected = initialDate && new Date(initialDate).getFullYear() === year && new Date(initialDate).getMonth() === month && new Date(initialDate).getDate() === i;
            const isFuture = dateAtCell > today;

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.dayCell,
                        isSelected && styles.selectedDay,
                        isToday && !isSelected && styles.todayCell,
                        isFuture && { opacity: 0.3 }
                    ]}
                    onPress={() => !isFuture && handleSelectDay(i)}
                    disabled={isFuture}
                >
                    <Text style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isToday && !isSelected && styles.todayText,
                        isFuture && { color: '#cbd5e1' }
                    ]}>
                        {i}
                    </Text>
                </TouchableOpacity>
            );
        }

        return days;
    };

    const renderMonths = () => {
        return months.map((m, index) => {
            const isFuture = currentDate.getFullYear() === today.getFullYear() && index > today.getMonth();
            return (
                <TouchableOpacity
                    key={m}
                    style={[
                        styles.monthYearItem,
                        currentDate.getMonth() === index && styles.selectedItem,
                        isFuture && { opacity: 0.3 }
                    ]}
                    onPress={() => !isFuture && handleSelectMonth(index)}
                    disabled={isFuture}
                >
                    <Text style={[
                        styles.monthYearText,
                        currentDate.getMonth() === index && styles.selectedItemText,
                        isFuture && { color: '#cbd5e1' }
                    ]}>
                        {t(m)}
                    </Text>
                </TouchableOpacity>
            );
        });
    };

    const renderYears = () => {
        const currentYear = today.getFullYear();
        const years = [];
        for (let i = currentYear; i >= 1920; i--) {
            years.push(
                <TouchableOpacity
                    key={i}
                    style={[styles.monthYearItem, currentDate.getFullYear() === i && styles.selectedItem]}
                    onPress={() => handleSelectYear(i)}
                >
                    <Text style={[styles.monthYearText, currentDate.getFullYear() === i && styles.selectedItemText]}>
                        {i}
                    </Text>
                </TouchableOpacity>
            );
        }
        return years;
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
                        <TouchableOpacity
                            style={styles.headerTitleContainer}
                            onPress={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                        >
                            <Text style={styles.headerTitle}>{t(months[currentDate.getMonth()])}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerTitleContainer}
                            onPress={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                        >
                            <Text style={styles.headerTitle}>{currentDate.getFullYear()}</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        {viewMode === 'days' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                                    <View style={styles.navBtnInner}>
                                        <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={20} color="#1e293b" />
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                                    <View style={styles.navBtnInner}>
                                        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color="#1e293b" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.contentArea}>
                        {viewMode === 'days' && (
                            <View style={styles.calendarGrid}>
                                <View style={[styles.weekDays, isRTL && { flexDirection: 'row-reverse' }]}>
                                    {daysOfWeek.map((d, i) => (
                                        <View key={i} style={styles.dayCell}>
                                            <Text style={styles.weekDayText}>{d}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={[styles.daysGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                                    {renderDays()}
                                </View>
                            </View>
                        )}

                        {(viewMode === 'months' || viewMode === 'years') && (
                            <ScrollView
                                style={{ maxHeight: 280 }}
                                contentContainerStyle={styles.selectionGrid}
                                showsVerticalScrollIndicator={false}
                            >
                                {viewMode === 'months' ? renderMonths() : renderYears()}
                            </ScrollView>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.todayBtn}
                            onPress={() => {
                                setCurrentDate(today);
                                setViewMode('days');
                            }}
                        >
                            <Text style={styles.todayBtnText}>{t('today') || 'Aujourd\'hui'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
            android: { elevation: 12 }
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    headerTitleContainer: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    navBtn: {
        marginLeft: 8,
    },
    navBtnInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    contentArea: {
        minHeight: 280,
    },
    calendarGrid: {
        width: '100%',
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: 10,
        width: '100%',
    },
    weekDayText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94a3b8',
        textAlign: 'center',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    dayCell: {
        width: '14.28%', // 100 / 7
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayText: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    selectedDay: {
        backgroundColor: '#2563eb',
        borderRadius: 14,
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: '700',
    },
    todayCell: {
        borderColor: '#2563eb',
        borderWidth: 1.5,
        borderRadius: 14,
    },
    todayText: {
        color: '#2563eb',
        fontWeight: '700',
    },
    selectionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 10,
        gap: 10,
        justifyContent: 'center',
    },
    monthYearItem: {
        width: '30%', // roughly 3 per row
        paddingVertical: 14,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    selectedItem: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    monthYearText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    selectedItemText: {
        color: '#fff',
    },
    footer: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 15,
    },
    todayBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
    },
    todayBtnText: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 14,
    },
    closeBtn: {
        padding: 8,
    },
    closeBtnText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 14,
    },
});

export default CustomCalendar;
