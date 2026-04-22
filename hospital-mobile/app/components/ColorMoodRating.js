import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LEVELS = [
    { note: 1, bg: '#fee2e2', border: '#fecaca', labelKey: 'ratingLevel1' },
    { note: 2, bg: '#ffedd5', border: '#fdba74', labelKey: 'ratingLevel2' },
    { note: 3, bg: '#fef9c3', border: '#fde047', labelKey: 'ratingLevel3' },
    { note: 4, bg: '#dcfce7', border: '#86efac', labelKey: 'ratingLevel4' },
    { note: 5, bg: '#bbf7d0', border: '#22c55e', labelKey: 'ratingLevel5' },
];

export default function ColorMoodRating({ value, onChange, isRTL, t }) {
    return (
        <View style={[styles.wrap, isRTL && { alignItems: 'stretch' }]}>
            {LEVELS.map((lvl) => {
                const selected = value === lvl.note;
                return (
                    <TouchableOpacity
                        key={lvl.note}
                        onPress={() => onChange(lvl.note)}
                        activeOpacity={0.85}
                        style={[
                            styles.row,
                            { backgroundColor: lvl.bg, borderColor: selected ? lvl.border : 'rgba(0,0,0,0.06)' },
                            selected && styles.rowSelected,
                            isRTL && { flexDirection: 'row-reverse' },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t(lvl.labelKey)}
                    >
                        <View
                            style={[
                                styles.swatch,
                                { backgroundColor: lvl.border },
                                isRTL ? { marginRight: 0, marginLeft: 14 } : { marginRight: 14, marginLeft: 0 },
                            ]}
                        />
                        <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t(lvl.labelKey)}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 10,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 2,
    },
    rowSelected: {
        borderWidth: 3,
    },
    swatch: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    label: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
});
