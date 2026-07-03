-- ════════════════════════════════════════════════════════════════════════
-- Seekho Engine v3 — Hardening migration (v2, schema-aware)
-- ════════════════════════════════════════════════════════════════════════
-- Idempotent. Adapts to your EXISTING ezyZip database schema:
--   Tables you already have: analytics, generated_lessons, districts,
--     syllabus, schools, feedback, waitlist, verified_context, teacher_progress
--   Your existing syllabus has: id, class_num, chapter_num, subject,
--     chapter, topics (ARRAY), pctb_ref, created_at
--
-- What this migration does:
--   1. Creates new tables: profiles, job_runs, rate_limits, audit_log
--   2. Adds MISSING columns to your existing `syllabus` table
--      (sort_order, updated_at, updated_by) — instead of trying to create
--      a fresh table.
--   3. Adds user_id to generated_lessons, analytics, verified_context.
--   4. Auto-provisions a profiles row on every new signup (trigger).
--   5. Replaces permissive `using (true)` policies with strict per-user RLS.
--
-- BEFORE RUNNING:
--   Supabase → Project Settings → Database → Backups → Create backup.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ── 1. ENUMS ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('teacher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ── 2. PROFILES TABLE ───────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  school_name text,
  district    text,
  role        user_role not null default 'teacher',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_profiles_role on profiles(role);

-- Auto-create profiles row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. SYLLABUS TABLE (PATCH your existing table — do NOT recreate) ─────
-- Your existing syllabus columns: id, class_num, chapter_num, subject,
-- chapter, topics (ARRAY), pctb_ref, created_at. We add the extras the
-- v3 admin editor needs, without breaking your existing rows.
alter table if exists syllabus
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

-- Only try to create this index once sort_order is guaranteed to exist.
create index if not exists idx_syllabus_lookup
  on syllabus (class_num, subject, sort_order);

-- ── 4. JOB_RUNS TABLE (Inngest tracking — optional) ─────────────────────
create table if not exists job_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_type      text not null,
  status        job_status not null default 'queued',
  input         jsonb not null,
  output        jsonb,
  error         text,
  inngest_id    text,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_job_runs_user_created on job_runs (user_id, created_at desc);
create index if not exists idx_job_runs_status on job_runs (status);

-- ── 5. RATE_LIMITS TABLE (fallback when Upstash is down) ────────────────
create table if not exists rate_limits (
  id         bigserial primary key,
  key        text not null,
  window_at  timestamptz not null,
  count      integer not null default 1,
  unique (key, window_at)
);
create index if not exists idx_rate_limits_key_window on rate_limits (key, window_at desc);

-- ── 6. AUDIT_LOG TABLE ──────────────────────────────────────────────────
create table if not exists audit_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  resource    text,
  resource_id text,
  metadata    jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_log_user_created on audit_log (user_id, created_at desc);
create index if not exists idx_audit_log_action on audit_log (action);

-- ── 7. ADD user_id TO YOUR EXISTING TABLES ──────────────────────────────
alter table if exists generated_lessons
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table if exists analytics
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table if exists verified_context
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Per-user unique constraint: one vote per (user, district, snippet)
-- Guarded so it only runs if verified_context exists.
do $$ begin
  if to_regclass('public.verified_context') is not null then
    execute 'create unique index if not exists uniq_verified_context_user_snippet
      on verified_context (user_id, district, md5(snippet))';
  end if;
end $$;

-- ── 8. ENABLE RLS ON EVERYTHING (guarded per-table) ─────────────────────
alter table profiles      enable row level security;
alter table syllabus      enable row level security;
alter table job_runs      enable row level security;
alter table rate_limits   enable row level security;
alter table audit_log     enable row level security;

do $$ begin
  if to_regclass('public.generated_lessons') is not null then
    execute 'alter table generated_lessons enable row level security';
  end if;
  if to_regclass('public.analytics') is not null then
    execute 'alter table analytics enable row level security';
  end if;
  if to_regclass('public.verified_context') is not null then
    execute 'alter table verified_context enable row level security';
  end if;
  if to_regclass('public.teacher_progress') is not null then
    execute 'alter table teacher_progress enable row level security';
  end if;
end $$;

-- ── 9. DROP OLD PERMISSIVE POLICIES FROM YOUR ezyZip MIGRATIONS ─────────
do $$ begin
  if to_regclass('public.generated_lessons') is not null then
    execute 'drop policy if exists generated_lessons_all on generated_lessons';
    execute 'drop policy if exists generated_lessons_select on generated_lessons';
    execute 'drop policy if exists generated_lessons_insert on generated_lessons';
    execute 'drop policy if exists "lessons_owner_select" on generated_lessons';
    execute 'drop policy if exists "lessons_owner_insert" on generated_lessons';
    execute 'drop policy if exists "lessons_owner_update" on generated_lessons';
    execute 'drop policy if exists "lessons_owner_delete" on generated_lessons';
  end if;
  if to_regclass('public.analytics') is not null then
    execute 'drop policy if exists analytics_insert on analytics';
    execute 'drop policy if exists analytics_all on analytics';
    execute 'drop policy if exists "analytics_owner_insert" on analytics';
    execute 'drop policy if exists "analytics_admin_select" on analytics';
  end if;
  if to_regclass('public.verified_context') is not null then
    execute 'drop policy if exists verified_context_select on verified_context';
    execute 'drop policy if exists verified_context_insert on verified_context';
    execute 'drop policy if exists verified_context_update on verified_context';
    execute 'drop policy if exists "verified_context_auth_select" on verified_context';
    execute 'drop policy if exists "verified_context_auth_insert" on verified_context';
    execute 'drop policy if exists "verified_context_owner_update" on verified_context';
  end if;
  if to_regclass('public.teacher_progress') is not null then
    execute 'drop policy if exists teacher_progress_all on teacher_progress';
  end if;
end $$;

-- ── 10. STRICT RLS POLICIES ─────────────────────────────────────────────

-- profiles: user reads/updates own row; admins read all
drop policy if exists "profiles_owner_select"     on profiles;
drop policy if exists "profiles_owner_update"     on profiles;
drop policy if exists "profiles_admin_select_all" on profiles;
create policy "profiles_owner_select"     on profiles for select using (auth.uid() = id);
create policy "profiles_owner_update"     on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_select_all" on profiles for select using (
  exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin')
);

-- generated_lessons: owner-only CRUD
do $$ begin
  if to_regclass('public.generated_lessons') is not null then
    execute 'create policy "lessons_owner_select" on generated_lessons for select using (auth.uid() = user_id)';
    execute 'create policy "lessons_owner_insert" on generated_lessons for insert with check (auth.uid() = user_id)';
    execute 'create policy "lessons_owner_update" on generated_lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    execute 'create policy "lessons_owner_delete" on generated_lessons for delete using (auth.uid() = user_id)';
  end if;
end $$;

-- analytics: user inserts own rows; admins read all
do $$ begin
  if to_regclass('public.analytics') is not null then
    execute 'create policy "analytics_owner_insert" on analytics for insert with check (auth.uid() = user_id)';
    execute $q$create policy "analytics_admin_select" on analytics for select using (
      exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
    )$q$;
  end if;
end $$;

-- verified_context: any authenticated user reads; owner inserts/updates
do $$ begin
  if to_regclass('public.verified_context') is not null then
    execute 'create policy "verified_context_auth_select"  on verified_context for select using (auth.role() = ''authenticated'')';
    execute 'create policy "verified_context_auth_insert"  on verified_context for insert with check (auth.uid() = user_id)';
    execute $q$create policy "verified_context_owner_update" on verified_context for update using (
      auth.uid() = user_id
      or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
    )$q$;
  end if;
end $$;

-- syllabus: any authenticated user reads; admins write
drop policy if exists "syllabus_auth_select" on syllabus;
drop policy if exists "syllabus_admin_write" on syllabus;
create policy "syllabus_auth_select" on syllabus for select using (auth.role() = 'authenticated');
create policy "syllabus_admin_write" on syllabus for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
) with check (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- job_runs: owner reads own rows
drop policy if exists "job_runs_owner_select" on job_runs;
create policy "job_runs_owner_select" on job_runs for select using (auth.uid() = user_id);

-- audit_log: admins only
drop policy if exists "audit_log_admin_select" on audit_log;
create policy "audit_log_admin_select" on audit_log for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- rate_limits: NO policies — service role only.

-- ── DONE ────────────────────────────────────────────────────────────────
select 'Seekho v3 hardening migration completed successfully.' as status;
