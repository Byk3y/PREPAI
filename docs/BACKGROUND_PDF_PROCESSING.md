# Background PDF Processing

## Overview

Large PDFs (>50 pages or >10MB) are automatically routed to background processing to avoid Edge Function timeout limits. This enables reliable processing of documents up to 1000 pages.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React Native)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. User uploads large PDF                                       │
│  2. process-material detects large PDF                           │
│  3. Returns HTTP 202 with job_id                                 │
│  4. Client subscribes to Realtime for progress updates           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
├─────────────────────────────────────────────────────────────────┤
│  process-material (sync)                                         │
│    ├── Small PDFs: Process immediately                           │
│    └── Large PDFs: Enqueue to processing_queue                   │
│                                                                   │
│  process-large-pdf (async)                                       │
│    ├── Picks up jobs from queue                                  │
│    ├── Updates progress in real-time                             │
│    └── Handles retries with exponential backoff                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
├─────────────────────────────────────────────────────────────────┤
│  processing_queue table                                          │
│    ├── status: pending | processing | completed | failed         │
│    ├── progress: 0-100%                                          │
│    ├── progress_message: Human-readable status                   │
│    └── Realtime enabled for live updates                         │
└─────────────────────────────────────────────────────────────────┘
```

## Thresholds

| Metric | Threshold | Processing Mode |
|--------|-----------|-----------------|
| Pages | ≤50 | Synchronous |
| Pages | >50 | Background |
| File Size | ≤10MB | Synchronous |
| File Size | >10MB | Background |

## Database Schema

### processing_queue Table

```sql
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  material_id UUID NOT NULL,
  notebook_id UUID NOT NULL,
  
  job_type TEXT DEFAULT 'pdf_extraction',
  priority INTEGER DEFAULT 0,
  
  status processing_job_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  progress_message TEXT,
  
  estimated_pages INTEGER,
  processed_pages INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  
  result JSONB,
  error_message TEXT,
  error_details JSONB,
  
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ
);
```

### Job Status Enum

- `pending` - Job queued, waiting to be processed
- `processing` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed (may retry if attempts remaining)
- `cancelled` - Job was cancelled by user

## Client Usage

### Using the Hook

```tsx
import { useBackgroundProcessing } from '@/lib/hooks/useBackgroundProcessing';

function NotebookView({ notebookId }) {
  const { 
    job, 
    isProcessing, 
    isComplete, 
    isFailed,
    retryJob,
    cancelJob 
  } = useBackgroundProcessing({
    notebookId,
    onComplete: (result) => {
      console.log('Processing complete!', result);
      // Refresh notebook data
    },
    onError: (error) => {
      console.error('Processing failed:', error);
    },
    onProgress: (progress, message) => {
      console.log(`Progress: ${progress}% - ${message}`);
    },
  });

  if (isProcessing) {
    return <BackgroundProcessingIndicator notebookId={notebookId} />;
  }

  // ... rest of component
}
```

### Using the Component

```tsx
import { BackgroundProcessingIndicator } from '@/components/BackgroundProcessingIndicator';

// Full display (card with progress bar)
<BackgroundProcessingIndicator 
  notebookId={notebook.id}
  onComplete={() => refetchNotebook()}
/>

// Compact display (inline status)
<BackgroundProcessingIndicator 
  notebookId={notebook.id}
  compact={true}
/>
```

## API Response Changes

### Small PDF (Sync Processing)

```json
{
  "success": true,
  "material_id": "uuid",
  "notebook_id": "uuid",
  "preview": { "overview": "..." },
  "message": "Material processed and preview generated"
}
```

### Large PDF (Background Processing)

```json
{
  "success": true,
  "material_id": "uuid",
  "notebook_id": "uuid",
  "background_processing": true,
  "job_id": "uuid",
  "estimated_pages": 500,
  "message": "Large PDF queued for background processing..."
}
```

HTTP Status: `202 Accepted`

## Retry Logic

- Max attempts: 3
- Exponential backoff: 1min, 2min, 4min
- Retryable errors: Network, timeout, rate limits
- Non-retryable: Invalid PDF, permission denied, not found

## Monitoring

Jobs automatically clean up after 7 days. Monitor via:

```sql
-- Active jobs
SELECT * FROM processing_queue WHERE status IN ('pending', 'processing');

-- Failed jobs
SELECT * FROM processing_queue WHERE status = 'failed';

-- Job success rate
SELECT 
  status, 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM processing_queue
GROUP BY status;
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_PDF_PAGES` | 1000 | Maximum allowed pages |
| `MAX_PDF_SIZE_MB` | 50 | Maximum file size in MB |
| `EDGE_TIMEOUT_CAP_MS` | 140000 | Edge function timeout cap |

## Deployment

1. Apply migration:
   ```bash
   supabase db push
   ```

2. Deploy Edge Functions:
   ```bash
   supabase functions deploy process-material
   supabase functions deploy process-large-pdf
   ```

3. Regenerate TypeScript types:
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts
   ```
