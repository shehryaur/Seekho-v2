-- ════════════════════════════════════════════════════════════════════
-- Seekho Engine — Phase 3
-- Local Analogy Flywheel: teacher-verified snippet store.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- Drop legacy pruned columns/tables (idempotent, safe on fresh DBs).
alter table if exists generated_lessons
  drop column if exists substitute_uuid,
  drop column if exists substitute_guide,
  drop column if exists is_public,
  drop column if exists effectiveness_confirmations,
  drop column if exists exam_type,
  drop column if exists marks,
  drop column if exists time_limit_minutes;

drop table if exists community_validations;

-- ── verified_context ──────────────────────────────────────────────────
-- One row per (district, snippet) pair. Votes increment via the
-- /api/analogy endpoint. buildPrompt() reads the top N rows per district
-- and injects them as gold-standard examples into Gemini's system prompt.
create table if not exists verified_context (
  id          bigserial primary key,
  district    text        not null,
  class_num   integer,
  subject     text,
  section     text        not null,
  snippet     text        not null,
  votes       integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint verified_context_section_check
    check (section in ('teacher', 'student', 'activity', 'quiz', 'homework', 'parent'))
);

create index if not exists idx_verified_context_district
  on verified_context (district, votes desc);

create index if not exists idx_verified_context_class_subject
  on verified_context (class_num, subject, votes desc);

-- Prevent duplicate identical snippets per district — instead of inserting
-- a new row, the application increments `votes` (see saveVerifiedSnippet).
create unique index if not exists uniq_verified_context_district_snippet
  on verified_context (district, md5(snippet));

-- Keep updated_at fresh on every UPDATE.
create or replace function set_verified_context_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_verified_context_updated_at on verified_context;
create trigger trg_verified_context_updated_at
before update on verified_context
for each row execute function set_verified_context_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────
alter table verified_context enable row level security;

-- Public read so the prompt builder can fetch via the anon client.
drop policy if exists verified_context_select on verified_context;
create policy verified_context_select
  on verified_context for select
  using (true);

-- Public insert (a thumbs-up is a low-stakes opinion vote).
drop policy if exists verified_context_insert on verified_context;
create policy verified_context_insert
  on verified_context for insert
  with check (true);

-- Public update so the increment-vote path works for anon clients.
-- Tighten this in production if you add auth.
drop policy if exists verified_context_update on verified_context;
create policy verified_context_update
  on verified_context for update
  using (true) with check (true);
