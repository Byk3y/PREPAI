# 🚀 Brigo AI: Premium Experience Refactor Plan

This plan outlines the steps to transform Brigo into a prestige study platform by establishing a unique AI persona, a relatable study companion (The Spark), and a more sophisticated educational philosophy.

## Phase 1: The "Identity" Update (The Sage & The Spark)
*Focus: Establish Brigo as the AI persona and the Pet as the user’s relatable study companion.*

- [ ] **Refactor `script-generator.ts` Character Identities**
    - [ ] Change "Teacher" to **Brigo** in all system/user prompts.
    - [ ] Change "Student" to the user's dynamic **Pet Name**.
    - [ ] Add hidden pronunciation key: `Brigo is pronounced "BRIG-oh". Use phonetic spelling "Brigg-oh" if needed for TTS.`
- [ ] **Standardize Signature Voice Pair**
    - [ ] Map **Brigo** to voice: `Charon` (Deep, Wise, Authority).
    - [ ] Map **Pet (The Spark)** to voice: `Puck` (Curious, Insightful, Bright).
- [ ] **Technical Optimization**
    - [ ] Remove `detectGender` function and the secondary LLM call (save ~2s latency).
    - [ ] Implement **Dynamic Word Count Scaler**: `Math.max(400, Math.min(1000, material_chars / 20))` to respect user time and survive Free Tier timeouts.
- [ ] **Source Awareness**
    - [ ] Pass `material.kind` into the script generator.
    - [ ] Update prompts to mention sources specifically (e.g., "Looking at that YouTube video you imported...").

## Phase 2: Prestige Script Structure (The "NotebookLM" Feel)
*Focus: Stop simple summarizing; start deep educational synthesis.*

- [ ] **The Ritual Intro**
    - [ ] Enforce a consistent opening: `"Brigo: Welcome back. I’m Brigo, and [Pet Name] is here to help me break down your notes on [Topic]."`
- [ ] **The "Insight" Loop**
    - [ ] Prompt Brigo to provide the **Mechanism** (The "How").
    - [ ] Prompt the Pet to provide the **Meaning** (The "Relatable Analogy").
- [ ] **The "Double-Lock" Outro**
    - [ ] Replace generic goodbyes with a 30-second "Battle of the Takeaways."
    - [ ] Brigo gives one complex fact; Pet gives one simple mnemonic.

## Phase 3: The "Coach" Chat Experience
*Focus: Transition from "Assistant" to "Active Partner".*

- [ ] **Update `notebook-chat/index.ts` System Prompt**
    - [ ] Infuse Brigo's persona: Intelligent, dry humor, encouraging.
    - [ ] Instruction: Occasionally suggest the Pet explain things differently.
- [ ] **Mobile-First Visuals**
    - [ ] Force specific Markdown patterns for readability (Quote blocks for definitions, Bold for terminology).

## Phase 4: Studio Mastery (Flashcards & Quizzes)
*Focus: Test application, not just recall.*

- [ ] **Application-First Flashcards**
    - [ ] Update `generate-studio-content/index.ts` to include 20% "Scenario Cards".
- [ ] **The "Boss Card"**
    - [ ] Ensure every deck ends with a comprehensive synthesis card.

## Phase 5: Technical Resilience & Delivery
*Focus: Ensure #1 App Store quality and zero-crash reliability.*

- [ ] **Elastic Constraints**
    - [ ] In `process-material/index.ts`, replace hard-crashing word count checks with "Soft Warnings" in the prompt.
- [ ] **Token Truncation**
    - [ ] Clamp input content at 10,000 characters for Free Tier users to avoid 10s timeout wall.
- [ ] **The Brigo Watermark**
    - [ ] (Future) Add a signature audio jingle at the start/end of TTS generation.

---

## Success Metrics:
1. **Podcast Quality:** Higher synthesis vs. raw summary.
2. **Latency:** -2 seconds due to gender-detection removal.
3. **Reliability:** 0% timeout failures for notes under 5 pages on Free Tier.
4. **Brand:** Brigo is mentioned as a character in every study session.
