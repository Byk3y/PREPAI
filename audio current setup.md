# Audio Current Setup

## Overview

The audio system generates NotebookLM-style podcast audio overviews from notebook materials using a two-stage process:
1. **Script Generation**: Gemini 2.5 Flash extracts insights and generates dialogue scripts
2. **Audio Generation**: Gemini 2.5 Flash TTS converts scripts to multi-speaker podcast audio

## Architecture

### Components

1. **Edge Function**: `supabase/functions/generate-audio-overview/index.ts`
   - Main orchestration function
   - Handles authentication, quota checks, and workflow coordination

2. **Script Generator**: `supabase/functions/_shared/script-generator.ts`
   - Two-stage script generation process
   - Stage 1: Extract key insights from material
   - Stage 2: Generate dialogue script with dynamic characters

3. **TTS Generator**: `supabase/functions/_shared/gemini-tts.ts`
   - Converts script to audio using Gemini 2.5 Flash TTS
   - Supports multi-speaker dialogue natively
   - Handles audio format conversion (PCM → WAV)

4. **Frontend Hook**: `lib/hooks/useAudioGeneration.ts`
   - Manages audio generation state
   - Polls for status updates
   - Handles app state changes (foreground/background)

5. **API Client**: `lib/api/audio-overview.ts`
   - Client-side API wrapper
   - Status polling functions

## Generation Flow

### 1. Request Initiation
- User triggers generation from `StudioTab` component
- Frontend calls `generateAudioOverview(notebookId)`
- Edge function receives request with JWT authentication

### 2. Validation & Setup
- Authenticate user via JWT token
- Verify notebook ownership
- Check quota (trial users: 3 audio overviews)
- Fetch material content (minimum 500 characters)
- Fetch user's pet name (defaults to "Sparky")
- Create `audio_overviews` record with status `generating_script`

### 3. Script Generation (Two-Stage)

#### Stage 1: Extract Key Insights
- **Model**: Gemini 2.0 Flash
- **Input**: Material content (truncated to 30,000 chars)
- **Output**: 5-7 key insights in JSON format
- **Prompt**: Expert educational content analyst extracting insights

#### Stage 2: Generate Dialogue Script
- **Model**: Gemini 2.0 Flash
- **Input**: Key insights + notebook title + pet name
- **Output**: Dialogue script with speaker labels
- **Characters**:
  - **Pet Character**: User's pet name (e.g., "Sparky")
    - Voice: Kore (F) or Puck (M) based on gender detection
    - Role: The Enthusiastic Learner
  - **Teacher Character**: River (F) or Morgan (M)
    - Voice: Puck (M) or Kore (F) - swapped for contrast
    - Role: The Example-Driven Teacher
- **Target**: ~300 words/min × target minutes (2-5 min based on material length)

### 4. Audio Generation
- **Model**: Gemini 2.5 Flash TTS Preview
- **Input**: Generated script + speaker voice mapping
- **Output**: Multi-speaker audio (WAV format)
- **Retry Logic**: Exponential backoff (3 attempts)
- **Limits**: Script truncated to 12,000 characters if too long

### 5. Storage & Completion
- Upload audio to Supabase Storage: `uploads/{user_id}/audio_overviews/{notebook_id}/{overview_id}.wav`
- Generate signed URL (7-day expiration)
- Update record with final metadata
- Increment quota counter
- Log usage to `usage_logs` table

## Prompts

### Stage 1: Extract Key Insights

**System Prompt:**
```
You are an expert educational content analyst. Your task is to extract the most important and interesting insights from study material that would make for an engaging podcast discussion.

Focus on:
1. Core concepts and definitions
2. Surprising or counterintuitive facts
3. Real-world applications and examples
4. Common misconceptions to clarify
5. Connections to broader topics

Extract 5-7 key insights that cover the full scope of the material.
```

**User Prompt:**
```
Material Title: {notebookTitle}

Material Content:
{truncatedMaterial}

Extract 5-7 key insights from this material. For each insight, provide:
- A clear, concise statement (1-2 sentences)
- Why it's important or interesting

Return ONLY a JSON object with this structure:
{
  "insights": [
    "Insight 1: [statement]",
    "Insight 2: [statement]",
    ...
  ]
}
```

### Stage 2: Generate Dialogue Script

**System Prompt:**
```
You are a professional educational podcast scriptwriter.
Two hosts:
1. {PET_NAME} (The Enthusiastic Learner): A curious, energetic, and slightly playful learner. Represents the user's pet {petName}. Asks asking clarifying questions, making relatable (sometimes funny) comparisons, and is eager to learn.
2. {TEACHER_NAME} (The Example-Driven Teacher): A knowledgeable, patient, and warm guide. Explains complex ideas clearly using metaphors. Encouraging and supportive of {petName}'s progress.

Create a natural, conversational podcast script.

CRITICAL INSTRUCTIONS:
- **INTRODUCTION**: The script MUST start with a brief, friendly introduction where they say hello and ideally mention each other's names so the listener knows who is who.
  - Example: "{teacherName}: Welcome back! Today I'm here with {petName}."
  - Example: "{petName}: Hey everyone! It's me, {petName}, and I'm ready to learn with {teacherName}!"
- **TONE**: Fun, educational, slightly playful but focused on the content.
- **FORMAT**: Authentic dialogue. Use interjections ("Whoa", "I see", "Wait...").
- **TAKEAWAY**: End with a short summary or encouraging thought.

TARGET: {targetWordCount} words.
```

**User Prompt:**
```
Topic: {notebookTitle}

Key Insights to Cover:
1. {insight1}
2. {insight2}
...

Generate the podcast script.
FORMAT (pure text with speaker labels):
{teacherName}: [Intro]
{petName}: [Response]
...

Return ONLY the script.
```

## Database Schema

### `audio_overviews` Table

```sql
CREATE TABLE audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  title TEXT NOT NULL,
  duration REAL NOT NULL, -- Duration in seconds
  version INTEGER DEFAULT 1, -- Support regeneration (v1, v2, etc.)
  
  -- Storage
  storage_path TEXT NOT NULL,
  audio_url TEXT, -- Signed URL (7-day expiration)
  file_size_bytes BIGINT,
  
  -- Generation data
  script TEXT NOT NULL, -- Full dialogue script
  voice_config JSONB DEFAULT '{"host_a": "Alex", "host_b": "Morgan"}'::jsonb,
  
  -- Cost tracking
  generation_cost_cents INTEGER,
  llm_tokens INTEGER,
  tts_audio_tokens INTEGER, -- 32 tokens/second for Gemini TTS
  
  -- Status tracking
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating_script', 'generating_audio', 'completed', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(notebook_id, version)
);
```

## Status Flow

1. `pending` → Initial state when record is created
2. `generating_script` → Script generation in progress
3. `generating_audio` → Audio generation in progress
4. `completed` → Successfully generated and uploaded
5. `failed` → Error occurred (with `error_message`)

## Cost Calculation

### Script Generation
- **Model**: Gemini 2.0 Flash
- **Cost**: ~$0.003 per 1K tokens
- **Tokens**: Input + Output tokens from both stages

### Audio Generation
- **Model**: Gemini 2.5 Flash TTS Preview
- **Cost**: ~$10 per 1M tokens
- **Tokens**: 32 tokens/second of audio
- **Calculation**: `(audioTokens / 1000) * 10` cents

### Total Cost
```
totalCostCents = scriptCostCents + ttsCostCents
```

## Quota System

- **Trial Users**: 3 audio overviews per user
- **Quota Check**: Before generation starts
- **Quota Increment**: After successful completion
- **Quota Table**: `user_quotas` with `audio` type

## Frontend Integration

### Status Polling
- Polls every 2 seconds during generation
- Handles network errors gracefully (continues on server)
- Resumes polling when app comes to foreground
- Updates progress UI with stage information

### Progress Stages
- `pending`: "Starting..."
- `generating_script`: "Writing podcast script..."
- `generating_audio`: "Creating audio..."

### Notification System
- Shows notification when generation completes
- Allows user to navigate to audio player
- Dismissible notification component

## Voice Configuration

### Dynamic Voice Assignment
- Pet name gender is detected via LLM
- **Female Pet Name** (e.g., "Luna"):
  - Pet: Kore (F)
  - Teacher: Morgan (M) - Puck voice
- **Male Pet Name** (e.g., "Rex"):
  - Pet: Puck (M)
  - Teacher: River (F) - Kore voice

### Available Voices
- **Kore**: Female voice
- **Puck**: Male voice

## Error Handling

### Retry Logic
- TTS generation: 3 attempts with exponential backoff
- Non-retryable errors: 400, 401, 403 (fail fast)

### Error States
- Script generation failure → Status: `failed`, error message stored
- Audio generation failure → Status: `failed`, error message stored
- Storage upload failure → Status: `failed`, error message stored

### Network Resilience
- Frontend polling continues even if app is backgrounded
- Server-side generation continues independently
- Status recovery when app returns to foreground

## File Storage

### Storage Path Format
```
uploads/{user_id}/audio_overviews/{notebook_id}/{overview_id}.{ext}
```

### Supported Formats
- WAV (primary)
- MP3 (if returned by TTS)
- Format determined from MIME type

### URL Management
- Signed URLs generated with 7-day expiration
- URLs regenerated on access if expired
- Storage bucket: `uploads`

## Limitations

1. **Script Length**: Maximum 12,000 characters (truncated if longer)
2. **Material Length**: Minimum 500 characters required
3. **Duration**: Target 2-5 minutes (based on material length)
4. **Quota**: 3 audio overviews for trial users
5. **Concurrent Generations**: One per notebook (versioned)

## Example: Generated Transcript (Real Example from Database)

### Input Material

**Notebook Title:** "Business Fundamentals"

**Material Content:**
```
A business is an organization or enterprise engaged in commercial, industrial, or professional activities, typically to make a profit by selling goods or services. Businesses range from small, single-person operations like a sole proprietorship to large, multinational corporations. They can be for-profit entities or nonprofit organizations.

Core components of a business
• Purpose: The primary goal is usually to make a profit, which is calculated as revenue minus costs. Other purposes include solving problems, advancing social causes, or fulfilling a personal interest.
• Operations: Businesses engage in the production, buying, and selling of goods (tangible products like electronics) and services (intangible offerings like haircuts).
• Profit: For profit-driven businesses, profit is vital for reinvesting and growth.
• Business Structure: Businesses can be structured in various ways, including sole proprietorships, partnerships, limited liability companies (LLCs), and corporations.
• Business Types: Businesses are often categorized by their size (e.g., small and medium-sized enterprises or SMEs) and sector (e.g., retail, agriculture, technology).
• Business Models: Entrepreneurs may choose to build a scalable business for rapid growth or a lifestyle business that supports a particular way of life.

Key activities in starting and running a business
• Planning: Developing a business plan is a crucial first step.
• Funding: Securing the necessary capital is essential.
• Legalities: Following the correct legal procedures is required.
• Operations: Establishing a location and building a customer base are key activities.
• Marketing: Developing a marketing plan is necessary to attract customers.
```

### Generated Transcript

**Pet Name:** Holian (Male name → Pet: Puck, Teacher: River with Kore voice)

**Generated Script:**
```
River: Welcome back to "Business Bites," everyone! Today, I'm here with my favorite furry learner, Holian!

Holian: Hey everyone! It's me, Holian, and I'm ready to soak up some business wisdom! I've got my notepad ready!

River: Excellent! Today, we're diving into some fundamental business concepts. Ready to get started?

Holian: Absolutely! But first, a question: Isn't business all about making money?

River: That's a common perception, Holian, but it's not the whole picture. While profit is important, many businesses aim to solve problems or contribute to society. Think of a company developing affordable housing, or one dedicated to cleaning up the ocean.

Holian: Whoa, so it's like... money is fuel, but the destination is something else?

River: Exactly! Now, let's talk about what businesses actually *offer*. There's a big difference between goods and services.

Holian: Goods and services... like apples and, uh... massages?

River: Precisely! Goods are tangible things you can hold, like electronics or food. Services are intangible – think haircuts, consulting, or entertainment. This difference affects everything from how they're produced to how they're marketed.

Holian: I see! So, a phone company sells phones (goods) and phone plans (services). Got it! What's next?

River: Business structure. This is how a business is legally organized. You've got sole proprietorships, partnerships, limited liability companies (LLCs), and corporations.

Holian: Sole... what-ships? LLCs? This sounds like alphabet soup!

River: Think of it like choosing the right shell for a turtle. A sole proprietorship is simple – it's just you and your business, directly linked. But that means you're personally liable for business debts. A corporation, on the other hand, is a separate legal entity.

Holian: So, if the corporation messes up, *it* gets in trouble, not me personally?

River: Generally speaking, yes. Each structure has different implications for liability, taxes, and how easily you can raise money. Corporations can issue stock, for example, to get funding.

Holian: Okay, so picking the right shell is super important!

River: Absolutely! Next up, let's talk about size and sector. Businesses can be small, medium, or large, and they operate in different sectors like retail, tech, healthcare...

Holian: So, a tiny coffee shop is different from, say, Google? Obvious, but... why does it matter?

River: It helps us understand their unique challenges and opportunities. A small business might struggle with marketing, while a large corporation might face issues with bureaucracy. Understanding the sector helps too. A tech company faces different regulations than a restaurant.

Holian: Right, tech changes super fast! Speaking of changes, what about different kinds of businesses? I saw an article about "lifestyle businesses."

River: Great question! There are scalable businesses, designed for rapid growth, and lifestyle businesses, which prioritize a certain way of life for the owner. Think of a tech startup aiming for a billion-dollar valuation versus a pottery studio that allows the owner to pursue their passion.

Holian: So, one wants to be HUGE, the other wants to be... just right?

River: Exactly! It's all about priorities. Now, let's talk about planning!

Holian: Planning? Like… scheduling meetings?

River: More than that! A business plan is a comprehensive document outlining your business goals, strategies, market analysis, financial projections… It's like a roadmap for success.

Holian: A roadmap! So, it tells you where to go and how to get there?

River: Precisely! It helps you secure funding, make informed decisions, and minimize risks by anticipating potential problems.

Holian: Sounds like a lot of work!

River: It is, but it's crucial. Finally, let's touch on legal compliance.

Holian: Legal stuff? Yikes.

River: It's essential! Neglecting legal procedures can lead to fines, lawsuits, even closure. Things like registering your business, obtaining permits, and complying with labor laws are critical.

Holian: So, ignoring the legal stuff is like… building a house on shaky ground?

River: A perfect analogy! Always seek expert advice to ensure you're compliant.

Holian: Whoa, that was a lot! So, businesses aren't *just* about making money. They can solve problems. They sell goods OR services, and the way they're set up legally matters a TON. Plus, knowing your size and sector helps, and you've gotta plan and follow the rules!

River: Exactly! Starting a business can seem daunting, but understanding these fundamentals will set you on the right path. Remember, every successful business started with a single idea and a commitment to learning.

Holian: So true! Thanks, River! That was amazing! I think I actually understand… business now!

River: You got it, Holian! And that's all for today's episode of "Business Bites." Keep learning, everyone!
```

**Generation Metadata:**
- **Audio Overview ID:** 855725f6-49f2-4d74-ab4e-1e71b0b98a77
- **Notebook ID:** 93d35e6a-9cd9-408c-bffa-b3594acfb05d
- **Status:** completed
- **Created At:** 2025-12-06 12:31:04 UTC
- **Characters:** Holian (Puck - Male), River (Kore - Female)
- **Word Count:** ~650 words
- **Estimated Duration:** ~2.2 minutes

## Future Enhancements

- [ ] Support for custom voice selection
- [ ] Background audio playback
- [ ] Audio playback position tracking
- [ ] Regeneration with different parameters
- [ ] Audio quality/format options
- [ ] Batch generation for multiple notebooks

