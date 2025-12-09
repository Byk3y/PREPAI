import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/lib/store';
import { useCamera } from '@/lib/hooks/useCamera';
import { useDocumentPicker } from '@/lib/hooks/useDocumentPicker';

export const useNotebookCreation = () => {
    const router = useRouter();
    const { addNotebook, loadNotebooks } = useStore();
    const { takePhoto } = useCamera();
    const { pickDocument } = useDocumentPicker();
    const [isAddingNotebook, setIsAddingNotebook] = useState(false);

    const navigateToNotebook = (notebookId: string) => {
        // We handle navigation in the component or return ID to component? 
        // Component has specific navigation logic to prevent flash.
        // Let's keep it simple here and just route push, assuming the component logic for flashing 
        // was specific to the list reloading. If we reload then navigate, we might need a small delay or 
        // the list reloading logic in the component needs to be aware.
        // The original code passed `isNavigating` state to prevent reload flashes.
        // Here we just return the ID and let the component handle navigation if needed, 
        // or we handle basic navigation here.
        router.push(`/notebook/${notebookId}`);
    };

    const handleAudioUpload = async () => {
        try {
            const result = await pickDocument();
            if (!result || result.cancelled) {
                return;
            }
            setIsAddingNotebook(true);
            // Zero-friction: auto-create notebook with audio material
            const notebookId = await addNotebook({
                title: result.name.replace(/\.(mp3|wav|m4a|aac)$/i, ''),
                flashcardCount: 0,
                progress: 0,
                color: 'purple',
                material: {
                    type: 'audio',
                    uri: result.uri,
                    title: result.name,
                    fileUri: result.uri,
                    filename: result.name,
                },
            });
            // Reload notebooks to show the new one immediately
            await loadNotebooks();
            // Trigger "Add your first study material" task
            const { checkAndAwardTask } = useStore.getState();
            if (checkAndAwardTask) {
                checkAndAwardTask('add_material');
            }
            setIsAddingNotebook(false);
            return notebookId;
        } catch (error) {
            setIsAddingNotebook(false);
            console.error('Error uploading audio:', error);
            Alert.alert('Error', 'Failed to upload audio. Please try again.');
            return null;
        }
    };

    const handlePDFUpload = async () => {
        try {
            const result = await pickDocument();

            if (!result || result.cancelled) {
                return;
            }

            setIsAddingNotebook(true);
            // Zero-friction: auto-create notebook with PDF material
            const notebookId = await addNotebook({
                title: result.name.replace('.pdf', ''),
                flashcardCount: 0,
                progress: 0,
                color: 'blue',
                material: {
                    type: 'pdf',
                    uri: result.uri,
                    title: result.name,
                    fileUri: result.uri,
                    filename: result.name,
                },
            });
            // Reload notebooks to show the new one immediately
            await loadNotebooks();
            // Trigger "Add your first study material" task
            const { checkAndAwardTask } = useStore.getState();
            if (checkAndAwardTask) {
                checkAndAwardTask('add_material');
            }
            setIsAddingNotebook(false);
            return notebookId;
        } catch (error) {
            setIsAddingNotebook(false);
            console.error('Error uploading PDF:', error);
            Alert.alert('Error', 'Failed to upload PDF. Please try again.');
            return null;
        }
    };

    const handlePhotoUpload = async () => {
        try {
            // Request media library permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please enable photo library access in your device settings to select images.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
                exif: false,
            });

            if (result.canceled) {
                return;
            }

            const image = result.assets?.[0];
            if (!image) {
                return;
            }

            setIsAddingNotebook(true);
            // Zero-friction: auto-create notebook with image material
            const notebookId = await addNotebook({
                title: image.fileName?.replace(/\.[^/.]+$/, '') || 'Image Notes',
                flashcardCount: 0,
                progress: 0,
                color: 'green',
                material: {
                    type: 'image',
                    uri: image.uri,
                    title: image.fileName || 'Image',
                    thumbnail: image.uri,
                    fileUri: image.uri,
                    filename: image.fileName || 'image.jpg',
                },
            });
            // Reload notebooks to show the new one immediately
            await loadNotebooks();
            // Trigger "Add your first study material" task
            const { checkAndAwardTask } = useStore.getState();
            if (checkAndAwardTask) {
                checkAndAwardTask('add_material');
            }

            setIsAddingNotebook(false);
            return notebookId;
        } catch (error) {
            setIsAddingNotebook(false);
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
            return null;
        }
    };

    const handleCameraUpload = async () => {
        try {
            // Use camera hook to take photo
            const result = await takePhoto();

            if (!result || result.cancelled) {
                return;
            }

            setIsAddingNotebook(true);
            // Zero-friction: auto-create notebook with camera photo
            const notebookId = await addNotebook({
                title: 'Camera Photo',
                flashcardCount: 0,
                progress: 0,
                color: 'green',
                material: {
                    type: 'image',
                    uri: result.uri,
                    title: 'Camera Photo',
                    thumbnail: result.uri,
                    fileUri: result.uri,
                    filename: `photo-${Date.now()}.jpg`,
                },
            });
            // Reload notebooks to show the new one immediately
            await loadNotebooks();
            // Trigger "Add your first study material" task
            const { checkAndAwardTask } = useStore.getState();
            if (checkAndAwardTask) {
                checkAndAwardTask('add_material');
            }

            setIsAddingNotebook(false);
            return notebookId;
        } catch (error) {
            setIsAddingNotebook(false);
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
            return null;
        }
    };

    const handleTextSave = async (title: string, content: string, type: 'note' | 'text') => {
        try {
            setIsAddingNotebook(true);
            // Zero-friction: auto-create notebook with text/note material (processed=true, status=preview_ready)
            const notebookId = await addNotebook({
                title: title,
                flashcardCount: 0,
                progress: 0,
                color: type === 'note' ? 'orange' : 'purple',
                material: {
                    type: type,
                    content: content,
                    title: title,
                },
            });

            // Trigger "Add your first study material" task
            // We use the store via import as this hook uses useStore
            const { checkAndAwardTask } = useStore.getState();
            if (checkAndAwardTask) {
                checkAndAwardTask('add_material');
            }



            setIsAddingNotebook(false);
            return notebookId;
        } catch (error) {
            setIsAddingNotebook(false);
            console.error('Error saving text:', error);
            Alert.alert('Error', 'Failed to save text. Please try again.');
            return null;
        }
    };

    return {
        isAddingNotebook,
        handleAudioUpload,
        handlePDFUpload,
        handlePhotoUpload,
        handleCameraUpload,
        handleTextSave,
    };
};
