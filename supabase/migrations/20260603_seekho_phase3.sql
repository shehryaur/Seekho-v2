-- Seekho Engine Phase 3 schema expansion
create extension if not exists pgcrypto;

alter table if exists generated_lessons
  add column if not exists inventory jsonb,
  add column if not exists resource_level text default 'low',
  add column if not exists multi_grade_enabled boolean default false,
  add column if not exists multi_grade_mix jsonb,
  add column if not exists homework_json jsonb,
  add column if not exists parent_engagement_card text,
  add column if not exists parent_card_generated boolean default false,
  add column if not exists parent_card_shared boolean default false,
  add column if not exists substitute_uuid uuid default gen_random_uuid(),
  add column if not exists substitute_guide text,
  add column if not exists is_public boolean default false,
  add column if not exists effectiveness_confirmations integer default 0,
  add column if not exists date_actually_taught date,
  add column if not exists lesson_date date,
  add column if not exists average_score numeric,
  add column if not exists lesson_went_well text,
  add column if not exists root_cause text,
  add column if not exists exam_type text,
  add column if not exists marks integer,
  add column if not exists time_limit_minutes integer;

create unique index if not exists idx_generated_lessons_substitute_uuid on generated_lessons(substitute_uuid);
create index if not exists idx_generated_lessons_public on generated_lessons(is_public, effectiveness_confirmations desc);
create index if not exists idx_generated_lessons_resource on generated_lessons(resource_level);

create table if not exists community_validations (
  id bigserial primary key,
  lesson_id text not null,
  created_at timestamptz default now()
);

create table if not exists teacher_progress (
  id bigserial primary key,
  school_name text,
  district text,
  class_num integer,
  subject text,
  chapter text,
  date_actually_taught date,
  created_at timestamptz default now()
);

alter table if exists community_validations enable row level security;
alter table if exists teacher_progress enable row level security;

create policy if not exists community_validations_insert on community_validations for insert with check (true);
create policy if not exists teacher_progress_all on teacher_progress for all using (true) with check (true);
