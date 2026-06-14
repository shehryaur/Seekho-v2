# Seekho Engine — Setup Guide (v2.1)

> **Audience**: A junior developer who has just cloned this repository and has zero context.
> **Goal**: Get a running `localhost:3000` in under 15 minutes, then deploy to Vercel.
> **Stack**: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) · Google Gemini 2.5 Flash.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Environment Variables](#3-environment-variables)
4. [Supabase: Project + Schema](#4-supabase-project--schema)
5. [Google Gemini API Key](#5-google-gemini-api-key)
6. [Run Locally](#6-run-locally)
7. [Smoke Test Checklist](#7-smoke-test-checklist)
8. [Deploy to Vercel](#8-deploy-to-vercel)
9. [Directory Tree Map](#9-directory-tree-map)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool          | Version  | Verify with                          |
| ------------- | -------- | ------------------------------------ |
| Node.js       | ≥ 20.x   | `node -v`                            |
| npm           | ≥ 10.x   | `npm -v`                             |
| Git           | any      | `git --version`                      |
| Supabase acct | free     | <https://supabase.com>               |
| Google AI key | free     | <https://aistudio.google.com/apikey> |

> You can substitute `pnpm` or `yarn` for `npm` if you prefer. Commands below use `npm`.

---

## 2. Clone & Install

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/seekho-engine.git
cd seekho-engine/seekho-next

# 2. Install dependencies (one shot, no flags needed)
npm install

# 3. Confirm it installed cleanly
npm ls next react @supabase/supabase-js @google/generative-ai
```

Expected: no `UNMET DEPENDENCY` warnings. If you see any, run `npm install` once more.

---

## 3. Environment Variables

Create a file named **`.env.local`** in the `seekho-next/` directory (same folder as `package.json`). Paste exactly:

```bash
# ─── Google Gemini ──────────────────────────────────────────────────
GEMINI_API_KEY=AIza...                       # required, get from AI Studio

# ─── Supabase ───────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # the "anon public" key
SUPABASE_SERVICE_KEY=eyJhbGciOi...            # the "service_role" key (server-only)

# ─── App base URL (optional, used in metadata) ──────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠ **Never commit `.env.local`.** It is already in `.gitignore`.
> ⚠ The `SUPABASE_SERVICE_KEY` is a privileged key — Next.js will only expose it to server-side code because it does NOT start with `NEXT_PUBLIC_`.

### Variable Reference

| Variable                         | Required | Used by                                        |
| -------------------------------- | -------- | ---------------------------------------------- |
| `GEMINI_API_KEY`                 | ✅ yes   | `app/api/generate/route.ts`, `app/api/remediation/route.ts`, `app/api/weekly-planner/route.ts` |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅ yes   | `lib/supabase.ts` (browser + server)           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | ✅ yes   | `lib/supabase.ts` (browser + server)           |
| `SUPABASE_SERVICE_KEY`           | optional | `lib/supabase.ts` admin client (server only). Used by the analogy/thumbs-up endpoint to bypass RLS. |
| `NEXT_PUBLIC_APP_URL`            | optional | Print page metadata                            |

> If Supabase env vars are missing, the app will gracefully fall back to the in-memory `LOCAL_DISTRICTS` data and write nothing to a database. You can still run the daily generation loop, but `verified_context` and lesson persistence will be no-ops.

---

## 4. Supabase: Project + Schema

### 4.1 Create a project

1. Go to <https://supabase.com> → **New project**.
2. Region: pick the one closest to Pakistan (Frankfurt or Mumbai).
3. Set a strong DB password and save it in a password manager.
4. Wait ~2 minutes for the project to provision.

### 4.2 Copy your keys

Project → **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` → `SUPABASE_SERVICE_KEY`

### 4.3 Run the schema

Open **SQL Editor → New query**. Paste and run the following blocks **in order**.

#### Block A — Core lessons + districts (one-time)

```sql
create extension if not exists pgcrypto;

create table if not exists districts (
  name        text primary key,
  province    text,
  economy     text,
  landmarks   text,
  transport   text,
  food        text,
  occupations text,
  nature      text,
  local_names text,
  school_type text,
  connectivity text,
  board       text
);

create table if not exists syllabus (
  id          bigserial primary key,
  class_num   integer not null,
  subject     text    not null,
  chapter     text    not null,
  chapter_num integer,
  topics      jsonb,
  unique (class_num, subject, chapter)
);

create table if not exists generated_lessons (
  id              bigserial primary key,
  share_token     text unique default replace(gen_random_uuid()::text, '-', '') ,
  school_name     text,
  district        text,
  class_num       integer,
  subject         text,
  chapter         text,
  topic           text,
  language        text,
  output_mode     text,
  class_profile   text,
  content         text,
  inventory       jsonb,
  resource_level  text default 'low',
  multi_grade_enabled boolean default false,
  multi_grade_mix jsonb,
  homework_json   jsonb,
  parent_engagement_card text,
  parent_card_generated boolean default false,
  average_score   numeric,
  lesson_went_well text,
  root_cause      text,
  word_count      integer,
  created_at      timestamptz default now()
);

create table if not exists analytics (
  id          bigserial primary key,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_generated_lessons_district on generated_lessons (district);
create index if not exists idx_generated_lessons_class_subject on generated_lessons (class_num, subject);

alter table generated_lessons enable row level security;
create policy if not exists generated_lessons_all on generated_lessons for all using (true) with check (true);

alter table analytics enable row level security;
create policy if not exists analytics_insert on analytics for insert with check (true);
```

#### Block B — Phase-3 verified_context (Local Analogy Flywheel)

Run the file `supabase/migrations/20260604_verified_context.sql` exactly as-is. It will:

1. Drop pruned legacy columns from `generated_lessons` (substitute_uuid, exam_type, etc.).
2. Create the `verified_context` table with the schema shown below.
3. Add indices, an updated_at trigger, and permissive RLS policies.

```sql
create table verified_context (
  id          bigserial primary key,
  district    text        not null,
  class_num   integer,
  subject     text,
  section     text        not null
              check (section in ('teacher','student','activity','quiz','homework','parent')),
  snippet     text        not null,
  votes       integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index uniq_verified_context_district_snippet
  on verified_context (district, md5(snippet));
```

#### Block C — Seed districts (optional but recommended)

The app ships with a static fallback in `lib/districts.ts`. To make it dynamic, copy each district row from that file into a SQL `insert ... values (...)` statement. Example:

```sql
insert into districts (name, province, economy, landmarks, transport, food, occupations, nature, local_names, school_type, connectivity, board)
values
  ('Fateh Jang / Attock','Punjab','Sugarcane, brick kiln labour','Attock Fort, Indus River','Tractor-trolleys, Suzuki pickups','Makki ki roti, lassi','Farmers, mazdoor','Mustard fields, keekar trees','Akbar, Bashir, Zainab','Govt. Urdu-medium','3G, 8-12h load-shedding','BISE Rawalpindi')
on conflict (name) do nothing;
```

---

## 5. Google Gemini API Key

1. Visit <https://aistudio.google.com/apikey>.
2. Click **Create API key** → choose your Google Cloud project (or create one).
3. Copy the key. It looks like `AIzaSyC...`.
4. Paste into `.env.local` as `GEMINI_API_KEY=...`.

### Model used

The app is pinned to **`gemini-2.5-flash`** in three places:

- `app/api/generate/route.ts`
- `app/api/remediation/route.ts`
- `app/api/weekly-planner/route.ts`

> ⚠ Do **not** revert to `gemini-1.5-flash` or `gemini-flash-latest` — both were retired by Google and will return 404.

### Rate limits

The free tier allows ~15 req/min on Flash. If you hit `429`, wait 60 seconds and retry. For production, enable billing on your Google Cloud project to lift the limit.

---

## 6. Run Locally

```bash
# From seekho-next/
npm run dev
```

Open <http://localhost:3000>. You should see the cream-colored landing page with the bigger Seekho logo in the nav.

To generate a real lesson:
1. Fill **School name**.
2. Pick **District** (default `Fateh Jang / Attock`).
3. Pick **Class** → wait for **Subject** dropdown to populate.
4. Pick **Subject** → wait for **Chapter** dropdown.
5. Pick **Chapter**.
6. Click **Generate lesson pack**.

A successful request takes ~10–25 seconds. The tabs (`teacher`, `student`, `activity`, `quiz`, `homework`, `parent`) will populate with markdown.

---

## 7. Smoke Test Checklist

Run through these to confirm every Phase-1/2/3/4 deliverable works:

- [ ] Landing page background is **cream (#FEFAE0)**, not white or blue.
- [ ] Nav logo is **h-16** (clearly larger than text label).
- [ ] **Primary buttons are dark green (#283618)** with cream text.
- [ ] No "Exam Studio" or "Community" links in the nav.
- [ ] No `/exams`, `/community`, `/reports/coverage`, `/substitute/*` routes exist.
- [ ] Generate a lesson → all 6 tabs show readable text (no raw JSON dump). This validates the new aggressive `parseLessonJson`.
- [ ] Click **"This worked"** thumbs-up on a tab → toast says `Total votes: 1`. Re-generate; the next lesson's metadata bar mentions `N verified local examples used`.
- [ ] Disconnect WiFi → click **Generate** → yellow banner reads `Connection lost — N lessons queued locally`. Reconnect → click **Retry queued** → the lesson appears.
- [ ] Enable multi-grade → sliders sum to 100% → generate → `class_activity` tab shows Foundation / Core / Extension tracks.
- [ ] Open **Print-shop view** → page 1 has Student Handbook + Quiz; page 2 has **exactly 4 identical homework slips** in a 2x2 grid.
- [ ] Submit the Root Cause Classifier → response shows a pill like `Root cause: Delivery Gap` and a markdown remediation plan.

If all 11 boxes tick, the refactor is verified end-to-end.

---

## 8. Deploy to Vercel

```bash
# 1. Push your branch to GitHub
git push origin main

# 2. Import the repo in Vercel:
#    https://vercel.com/new
#    Root directory:   seekho-next
#    Framework preset: Next.js (auto-detected)

# 3. Add the four env vars in Project Settings → Environment Variables.
#    Mark them for Production, Preview, and Development.

# 4. Click Deploy. First build ~3 minutes.
```

After deploy, set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g., `https://seekho-engine.vercel.app`).

---

## 9. Directory Tree Map

```
seekho-next/
├── app/                              # Next.js App Router
│   ├── api/                          # Server-side API routes (Node runtime)
│   │   ├── analogy/route.ts          # NEW. POST a thumbs-up → verified_context.
│   │   ├── generate/route.ts         # Main lesson generator. Calls Gemini, parses JSON,
│   │   │                             #   injects verified_context, persists row.
│   │   ├── remediation/route.ts      # 10-min remediation plan after a quiz.
│   │   │                             #   Classifies into Delivery / Curriculum / Mismatch.
│   │   ├── syllabus/route.ts         # Cascading dropdown source: subjects → chapters → topics.
│   │   └── weekly-planner/route.ts   # Batch-generate 5 chapters in parallel.
│   │
│   ├── dashboard/page.tsx            # Coverage Velocity Tracker (roadmap).
│   ├── print/[id]/page.tsx           # Print-shop view (loads lesson by share_token).
│   ├── week/page.tsx                 # Plan-My-Week page.
│   │
│   ├── globals.css                   # Tailwind layer + Seekho design tokens
│   │                                 #   (.seekho-card, .seekho-btn-primary, .seekho-pill,
│   │                                 #   .seekho-input). Uses cream / brand / olive / brown.
│   ├── layout.tsx                    # Root HTML shell, KaTeX CSS, font config.
│   └── page.tsx                      # Landing page (Hero + LessonGenerator).
│
├── components/                       # Client-side React components
│   ├── AppShellNav.tsx               # Top nav. Logo is h-16. Links: Roadmap / Plan My Week.
│   ├── EscapeHatchSelect.tsx         # Dropdown + "type custom" fallback (essential UX).
│   ├── InventorySelector.tsx         # Classroom inventory checkbox grid.
│   ├── LessonGenerator.tsx           # ★ The heart of the app. Form → fetch → tabs.
│   │                                 #   Implements:
│   │                                 #     - Load-shedding sync queue (localStorage)
│   │                                 #     - Local Analogy Flywheel thumbs-up button
│   │                                 #     - Multi-grade sliders
│   │                                 #     - Root-cause classifier
│   ├── MarkdownRenderer.tsx          # Wraps react-markdown + remark-gfm + KaTeX.
│   ├── PrintLayout.tsx               # A4 print view. Page 1 = handbook+quiz, Page 2 = 4 slips.
│   ├── SyllabusRoadmap.tsx           # Velocity tracker.
│   └── WeeklyBatchPlanner.tsx        # Plan-my-week UI.
│
├── lib/                              # Shared utilities (no React)
│   ├── academicCalendar.ts           # Date math for velocity status.
│   ├── buildPrompt.ts                # ★ Prompt builder + aggressive JSON parser.
│   │                                 #   parseLessonJson handles markdown fences,
│   │                                 #   truncated JSON, and falls back to key-by-key
│   │                                 #   regex extraction.
│   ├── classConfig.ts                # Per-class pedagogical rules (vocab, Bloom, length).
│   ├── districts.ts                  # Static fallback districts (used when Supabase off).
│   ├── pctb_syllabus.ts              # Static PCTB syllabus tree (used when DB empty).
│   ├── supabase.ts                   # ★ Client factory + typed helpers.
│   │                                 #   Includes saveVerifiedSnippet, getTopVerifiedSnippets.
│   └── utils.ts                      # cn() (clsx + twMerge), toWhatsAppUrl(), percent().
│
├── supabase/
│   └── migrations/
│       ├── 20260603_seekho_phase3.sql       # Historical migration (Phase 3 prep).
│       └── 20260604_verified_context.sql    # ★ New. verified_context table + RLS.
│
├── public/                           # (none — logo is hosted on i.ibb.co)
├── .env.local                        # You create this. Never committed.
├── next.config.ts                    # Image remote pattern (i.ibb.co) etc.
├── package.json                      # Dependencies & scripts.
├── postcss.config.mjs                # Tailwind/autoprefixer wiring.
├── setup.md                          # This file.
├── tailwind.config.ts                # ★ Seekho color tokens (cream, brand, olive, brown, ink).
└── tsconfig.json                     # Strict TypeScript + @/* path alias.
```

★ = files most worth reading first when onboarding.

### What was DELETED in the v2.1 prune

These paths no longer exist (and should not be re-introduced):

| Path                              | Reason                                             |
| --------------------------------- | -------------------------------------------------- |
| `app/api/community/*`             | Community lesson pool removed                      |
| `app/api/exam-paper/*`            | Exam paper generator removed                       |
| `app/community/*`                 | Community UI removed                               |
| `app/exams/*`                     | Exam studio UI removed                             |
| `app/reports/coverage/*`          | Annual coverage report removed                     |
| `app/substitute/[id]/*`           | Public substitute QR/UUID route removed            |
| `components/CommunityLessonPool.tsx` | Dead component                                  |
| `components/ExamPaperGenerator.tsx`  | Dead component                                  |
| `components/AnnualCoverageReport.tsx`| Dead component                                  |
| `lib/communitySeed.ts`            | Dead seed data                                     |
| `react-qr-code` (npm)             | Substitute QR feature removed                      |

---

## 10. Troubleshooting

### "GEMINI_API_KEY is missing"
You forgot `.env.local`. Create it (see §3), restart `npm run dev`.

### Tabs show raw JSON instead of formatted markdown
This used to happen on the old parser. The new `parseLessonJson` in `lib/buildPrompt.ts` handles fences and truncation. If you still see raw JSON, you are running stale code — rebuild with `rm -rf .next && npm run dev`.

### "Could not record your vote" toast
- Supabase env vars are missing → set them.
- OR the SQL migration was not run → run `20260604_verified_context.sql`.
- OR RLS is blocking writes → confirm the three policies (`select`, `insert`, `update`) exist.

### Yellow "Connection lost" banner appears even online
The queue persists across sessions. Click **Retry queued** to drain it.

### Print page is 4 slips on the same page as the handbook
The CSS uses `page-break-before: always` on `.homework-slip-page` and `break-inside: avoid` on each slip. If your browser ignores it, switch to Chrome — Firefox can render the same way but with `--enable-css-page-break-rules`.

### Behind-board-pace warning never shows even when behind
Check `lib/academicCalendar.ts`. The board-exam target date is `2027-02-15`. Adjust if your school year is different.

---

**That's it.** Welcome to Seekho Engine. If something here is wrong or stale, open a PR against this file first — code without updated `setup.md` will not be merged.
