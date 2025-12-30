import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/store/types';

export function useNotebookChat(notebookId: string) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addChatMessage = useStore(state => state.addChatMessage);
    const updateLastChatMessage = useStore(state => state.updateLastChatMessage);
    const authUser = useStore(state => state.authUser);
    const checkAndAwardTask = useStore(state => state.checkAndAwardTask);

    const sendMessage = useCallback(async (message: string, selectedMaterialIds: string[]) => {
        if (!authUser || !message.trim()) return;

        setIsStreaming(true);
        setError(null);

        // 1. Generate IDs for optimistic updates
        const userMsgId = Date.now().toString();
        const assistantMsgId = (Date.now() + 1).toString();

        // 2. Optimistic User Message
        const userMsg: ChatMessage = {
            id: userMsgId,
            notebook_id: notebookId,
            role: 'user',
            content: message,
            sources: selectedMaterialIds,
            created_at: new Date().toISOString(),
        };
        addChatMessage(notebookId, userMsg);

        // 3. Add Placeholder Assistant Message
        const assistantMsg: ChatMessage = {
            id: assistantMsgId,
            notebook_id: notebookId,
            role: 'assistant',
            content: '', // Start empty
            sources: selectedMaterialIds,
            created_at: new Date().toISOString(),
        };
        addChatMessage(notebookId, assistantMsg);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notebook-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    notebook_id: notebookId,
                    message: message,
                    selected_material_ids: selectedMaterialIds,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to connect to AI assistant');
            }

            // 4. Get full JSON response
            const data = await response.json();
            const content = data.content || "I couldn't generate a response.";

            // 5. Update assistant message with final content
            updateLastChatMessage(notebookId, content);

            // 6. Award tasks
            checkAndAwardTask('chat_with_notebook');
            checkAndAwardTask('first_notebook_chat');

        } catch (err: any) {
            await handleError(err, {
                operation: 'notebook_chat',
                component: 'useNotebookChat',
                metadata: { notebookId, messageLength: message.length },
            });
            setError(err.message);

            // Update with a helpful error message if we hit a snag
            updateLastChatMessage(
                notebookId,
                "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment."
            );
        } finally {
            setIsStreaming(false);
        }
    }, [notebookId, authUser, addChatMessage, updateLastChatMessage]);

    return {
        sendMessage,
        isStreaming,
        error,
    };
}
