import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/lib/store';
import { useCamera } from '@/lib/hooks/useCamera';
import { useDocumentPicker } from '@/lib/hooks/useDocumentPicker';
import { useErrorHandler } from './useErrorHandler';
import { checkCanCreateContent } from '@/lib/services/subscriptionService';
import type { LimitReason } from '@/lib/services/subscriptionService';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

export const useMaterialAddition = (notebookId: string) => {
    const { addMaterial, loadNotebooks, user, notebooks, cachedPetState, flashcardsStudied } = useStore();
    const { takePhoto } = useCamera();
    const { pickDocument } = useDocumentPicker();
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [limitReason, setLimitReason] = useState<LimitReason>(null);
    const { handleError, withErrorHandling } = useErrorHandler();
    const { trackCreateAttemptBlocked, trackUpgradeModalShown } = useUpgrade();

    // Check if user can add content (based on subscription status)
    // For now reusing notebook creation logic as per MVP rules
    const checkCanAdd = useCallback(() => {
        const { tier, status, isExpired, trialEndsAt } = useStore.getState();
        const check = checkCanCreateContent(tier, status, isExpired, trialEndsAt);
        if (!check.canCreate) {
            trackCreateAttemptBlocked('material');
            trackUpgradeModalShown('create_attempt');
            setLimitReason(check.reason);
            setShowUpgradeModal(true);
            return false;
        }
        return true;
    }, [trackCreateAttemptBlocked, trackUpgradeModalShown]);

    const handleAudioUpload = useCallback(async () => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            const result = await pickDocument({ type: 'audio/*' });
            if (!result || result.cancelled) return null;

            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: 'audio',
                uri: result.uri,
                title: result.name,
                fileUri: result.uri,
                filename: result.name,
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_audio' });
    }, [checkCanAdd, pickDocument, addMaterial, notebookId, withErrorHandling]);

    const handlePDFUpload = useCallback(async () => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            const result = await pickDocument({ type: 'application/pdf' });
            if (!result || result.cancelled) return null;

            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: 'pdf',
                uri: result.uri,
                title: result.name,
                fileUri: result.uri,
                filename: result.name,
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_pdf' });
    }, [checkCanAdd, pickDocument, addMaterial, notebookId, withErrorHandling]);

    const handlePhotoUpload = useCallback(async () => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please enable photo library access.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });

            if (result.canceled || !result.assets?.[0]) return null;

            const image = result.assets[0];
            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: 'image',
                uri: image.uri,
                title: image.fileName || 'Image Notes',
                fileUri: image.uri,
                filename: image.fileName || 'image.jpg',
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_photo' });
    }, [checkCanAdd, addMaterial, notebookId, withErrorHandling]);

    const handleCameraUpload = useCallback(async () => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            const result = await takePhoto();
            if (!result || result.cancelled) return null;

            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: 'image',
                uri: result.uri,
                title: 'Camera Photo',
                fileUri: result.uri,
                filename: `photo-${Date.now()}.jpg`,
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_camera' });
    }, [checkCanAdd, takePhoto, addMaterial, notebookId, withErrorHandling]);

    const handleTextSave = useCallback(async (title: string, content: string, type: 'note' | 'text') => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: type,
                content: content,
                title: title,
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_text' });
    }, [checkCanAdd, addMaterial, notebookId, withErrorHandling]);

    const handleYouTubeImport = useCallback(async (url: string) => {
        if (!checkCanAdd()) return null;

        return withErrorHandling(async () => {
            let cleanUrl = url.trim();
            if (!cleanUrl.includes('youtube.com') && !cleanUrl.includes('youtu.be')) {
                throw new Error('Invalid YouTube URL');
            }

            setIsAddingMaterial(true);
            await addMaterial(notebookId, {
                type: 'youtube',
                uri: cleanUrl,
                title: 'YouTube Import',
            });
            setIsAddingMaterial(false);
            return true;
        }, { operation: 'add_youtube' });
    }, [checkCanAdd, addMaterial, notebookId, withErrorHandling]);

    return {
        isAddingMaterial,
        handleAudioUpload,
        handlePDFUpload,
        handlePhotoUpload,
        handleCameraUpload,
        handleTextSave,
        handleYouTubeImport,
        showUpgradeModal,
        setShowUpgradeModal,
        limitReason,
    };
};
