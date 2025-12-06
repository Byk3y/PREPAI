/**
 * Pet Name Editor - Editable pet name with inline editing
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface PetNameEditorProps {
    name: string;
    onNameChange: (newName: string) => void | Promise<void>;
}

export function PetNameEditor({ name, onNameChange }: PetNameEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(name);

    // Sync input when name changes externally
    useEffect(() => {
        if (!isEditing) {
            setInputValue(name);
        }
    }, [name, isEditing]);

    const handleSave = async () => {
        const trimmedName = inputValue.trim();
        if (trimmedName) {
            await onNameChange(trimmedName);
        } else {
            setInputValue(name);
        }
        setIsEditing(false);
    };

    const handleEdit = () => {
        setInputValue(name);
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <View style={styles.container}>
                <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onBlur={handleSave}
                    onSubmitEditing={handleSave}
                    autoFocus
                    maxLength={20}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.name}>{name}</Text>
            <TouchableOpacity
                onPress={handleEdit}
                style={styles.editButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    name: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#000000',
    },
    input: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#000000',
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#9370DB',
        paddingVertical: 4,
        minWidth: 100,
    },
    editButton: {
        padding: 4,
        marginLeft: 8,
    },
    editIcon: {
        fontSize: 18,
    },
});
