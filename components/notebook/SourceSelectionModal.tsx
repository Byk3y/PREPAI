/**
 * SourceSelectionModal - Modal for selecting which sources to use in chat
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import type { Material } from '@/lib/store';

interface SourceSelectionModalProps {
    visible: boolean;
    onDismiss: () => void;
    materials: Material[];
    selectedMaterialIds: string[];
    onToggleMaterial: (id: string) => void;
    onSelectAll: () => void;
}

export const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
    visible,
    onDismiss,
    materials,
    selectedMaterialIds,
    onToggleMaterial,
    onSelectAll,
}) => {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    const allSelected = selectedMaterialIds.length === materials.length && materials.length > 0;

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case 'pdf': return 'document-text';
            case 'audio': return 'musical-notes';
            case 'image':
            case 'photo': return 'image';
            case 'website': return 'globe';
            case 'youtube': return 'logo-youtube';
            case 'copied-text': return 'document';
            default: return 'document';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onDismiss}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: isDarkMode ? '#1e1e20' : '#ffffff',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: '80%',
                        paddingTop: 16,
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, color: colors.text, fontFamily: 'Nunito-Bold' }}>Select sources</Text>
                        <TouchableOpacity onPress={onDismiss}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Select All */}
                    <TouchableOpacity
                        onPress={onSelectAll}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <Text style={{ fontSize: 16, color: colors.text, fontFamily: 'Nunito-SemiBold' }}>Select all</Text>
                        <View
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                backgroundColor: allSelected ? colors.primary : 'transparent',
                                borderWidth: allSelected ? 0 : 2,
                                borderColor: colors.textSecondary,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {allSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                    </TouchableOpacity>

                    {/* Sources List */}
                    <ScrollView style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                        {materials.map((mat, index) => {
                            const isSelected = selectedMaterialIds.includes(mat.id);
                            return (
                                <TouchableOpacity
                                    key={mat.id || index}
                                    onPress={() => onToggleMaterial(mat.id)}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                        paddingVertical: 12,
                                    }}
                                >
                                    <View style={{ width: 40, height: 40, backgroundColor: colors.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name={getMaterialIcon(mat.type)} size={18} color={colors.iconMuted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, color: colors.text, fontFamily: 'Nunito-Medium' }} numberOfLines={2}>
                                            {mat.filename || mat.title || `Source ${index + 1}`}
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 4,
                                            backgroundColor: isSelected ? colors.primary : 'transparent',
                                            borderWidth: isSelected ? 0 : 2,
                                            borderColor: colors.textSecondary,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Done Button */}
                    <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
                        <TouchableOpacity
                            onPress={onDismiss}
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 24,
                                paddingVertical: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito-Bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
