-- Track last viewed flashcard per user + notebook
create table if not exists public.user_flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  last_flashcard_id uuid references public.studio_flashcards(id) on delete set null,
  last_index integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_flashcard_progress_unique unique (user_id, notebook_id)
);

-- RLS: owner only
alter table public.user_flashcard_progress enable row level security;

create policy "Users can manage their own flashcard progress"
  on public.user_flashcard_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful index for lookups by user + notebook
create index if not exists user_flashcard_progress_user_notebook_idx
  on public.user_flashcard_progress (user_id, notebook_id);





















