import { Feather } from '@expo/vector-icons';
import React, { useCallback, useRef } from 'react';
import { I18nManager, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

const ACTION_WIDTH = 76;

/**
 * Glissement horizontal pour révéler une zone rouge ; un tap sur la poubelle appelle onDelete.
 * Seuil bas (~32 px) : moins de course que l’ancienne zone invisible quasi plein écran.
 */
export default function SwipeDeleteRow({
    children,
    onDelete,
    enabled = true,
    style,
    rowKey,
    cornerRadius = 22,
    accessibilityLabel = 'Supprimer'
}) {
    const rtl = I18nManager.isRTL;
    const swipeableRef = useRef(null);

    const runDelete = useCallback(() => {
        swipeableRef.current?.close?.();
        Promise.resolve(onDelete()).catch(() => {});
    }, [onDelete]);

    const renderDeleteAction = () => (
        <TouchableOpacity
            style={[
                styles.deletePanel,
                {
                    width: ACTION_WIDTH,
                    borderTopRightRadius: rtl ? 0 : cornerRadius,
                    borderBottomRightRadius: rtl ? 0 : cornerRadius,
                    borderTopLeftRadius: rtl ? cornerRadius : 0,
                    borderBottomLeftRadius: rtl ? cornerRadius : 0
                }
            ]}
            activeOpacity={0.88}
            onPress={runDelete}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
        >
            <Feather name="trash-2" size={26} color="#ffffff" />
        </TouchableOpacity>
    );

    if (!enabled) {
        return <View style={style}>{children}</View>;
    }

    return (
        <Swipeable
            ref={swipeableRef}
            key={rowKey}
            friction={1.08}
            overshootFriction={12}
            rightThreshold={Math.round(ACTION_WIDTH * 0.42)}
            leftThreshold={Math.round(ACTION_WIDTH * 0.42)}
            dragOffsetFromLeftEdge={12}
            dragOffsetFromRightEdge={12}
            {...(rtl
                ? { renderLeftActions: renderDeleteAction, overshootLeft: false }
                : { renderRightActions: renderDeleteAction, overshootRight: false })}
            style={style}
        >
            {children}
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    deletePanel: {
        flex: 1,
        backgroundColor: '#dc2626',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
