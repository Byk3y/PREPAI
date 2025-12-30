# Notebook AI Chat Implementation Plan

This document outlines the strategy for implementing the "Chat with Notebook" feature using **Grok 4.1 Fast** via OpenRouter, featuring a high-end streaming interface and source-specific context.

## 1. Objectives
*   **Ultra-Fast Response**: Aim for < 1.0s "Time to First Token" using Grok 4.1 Fast.
*   **Omniscient Context**: Leverage Grok's **2M token context window** to analyze entire notebooks without truncation.
*   **Streaming UI**: Real-time text generation (typing effect).
*   **Persistence**: Save chat history per notebook.

## 2. Technical Stack
*   **LLM**: **Grok 4.1 Fast** (via OpenRouter) - Primary Model.
*   **Backend**: Supabase Edge Functions + PostgreSQL.
*   **Frontend**: React Native (Expo) + Zustand (Store) + `EventSource`/Fetch Streaming.

---

## 3. Phase 1: Database & Infrastructure
### A. Database Schema
Create a new table `notebook_chat_messages` to track history:
*   `id`: UUID (Primary Key)
*   `notebook_id`: UUID (Foreign Key to notebooks)
*   `user_id`: UUID (Foreign Key to users)
*   `role`: 'user' | 'assistant'
*   `content`: Text
*   `sources`: JSONB (Array of material IDs referenced in this message)
*   `created_at`: Timestamp

### B. OpenRouter Configuration
Update `supabase/functions/_shared/openrouter.ts`:
*   Add `chat` configuration for `x-ai/grok-4.1-fast`.
*   Enable `stream: true` in the request parameters.

---

## 4. Phase 2: Backend Logic (Streaming Edge Function)
Create a new Edge Function: `supabase/functions/notebook-chat/`
*   **Input**: `notebook_id`, `message`, `selected_material_ids`.
*   **Context Retrieval**: Fetch `content` from `materials` table for all `selected_material_ids`.
*   **System Prompt**:
    *   Set persona: "Helpful Brigo Study Assistant".
    *   Instruct to use provided context strictly.
    *   Enforce concise, helpful, and formatted (Markdown) output.
*   **Streaming Helper**: Implement a `ReadableStream` output that proxies tokens from OpenRouter to the mobile app in real-time.

---

## 5. Phase 3: Frontend Implementation
### A. Store Integration
Update `lib/store/` to manage chat state:
*   `chatMessages`: Map of `notebookId -> Message[]`.
*   `isStreaming`: Boolean flag for UI loading states.

### B. Optimistic UI Hook
Create `useNotebookChat`:
*   Immediately append user message to local state.
*   Initiate fetch request to Edge Function.
*   Handle partial stream chunks and update the last "assistant" message iteratively.
*   Handle connection drops/retries.

### C. UI Components (`ChatTab.tsx`)
*   **Message List**: A `FlatList` of chat bubbles.
*   **Chat Bubbles**: Custom styled containers for 'user' vs 'assistant'.
*   **Markdown Support**: Render Grok's responses using existing `MarkdownText` component.
*   **Auto-Scroll**: Automatically scroll to bottom as new tokens arrive.

---

## 4. Risks & Mitigations
*   **Context Limits**: If sources are huge (e.g., a 500-page book), we will truncate context to the most relevant ~100k tokens (Grok handles up to 2M, but efficiency matters).
*   **Connection Drops**: Implement "Save on Finish" logic to ensure the database always has the complete final message even if the stream was interrupted.

---

## 6. Implementation Order
1.  **DB**: Run SQL migrations for `notebook_chat_messages`.
2.  **API**: Build and deploy `notebook-chat` Edge Function.
3.  **Logic**: Implement the streaming fetch hook in the app.
4.  **UI**: Build the message bubbles and scroll logic in `ChatTab.tsx`.
