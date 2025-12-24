/**
 * Notification slice - Global in-app notification state management
 */

import type { StateCreator } from 'zustand';

export type NotificationType = 'flashcards' | 'quiz' | 'audio' | 'success' | 'info';

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
    data?: any; // e.g., { notebookId: '...', setId: '...' }
}

export interface NotificationSlice {
    notification: NotificationPayload | null;
    notify: (payload: NotificationPayload) => void;
    dismissNotification: () => void;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set) => ({
    notification: null,
    notify: (payload) => set({ notification: payload }),
    dismissNotification: () => set({ notification: null }),
});
