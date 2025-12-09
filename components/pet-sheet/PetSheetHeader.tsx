/**
 * Pet Sheet Header - Handle bar for swipe-to-dismiss
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { PanResponderGestureState, GestureResponderHandlers } from 'react-native';

interface PetSheetHeaderProps {
    panHandlers: GestureResponderHandlers;
}

export function PetSheetHeader({ panHandlers }: PetSheetHeaderProps) {
    return (
        <View style={styles.handleContainer} {...panHandlers}>
            <View style={styles.handle} />
        </View>
    );
}

const styles = StyleSheet.create({
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: 'transparent',
        minHeight: 32,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 2.5,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
});
