# Seekho Engine

Hyper-local AI lesson planning and curriculum support for Pakistani teachers.

Built on Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase
(Postgres), and Google Gemini 2.5 Flash.

---

# Executive Summary
Seekho Engine is a hyper-local AI curriculum platform. It generates localized lesson plans for Pakistani teachers. The platform aligns with the Punjab Curriculum and Textbook Board (PCTB) syllabus. It serves resource-constrained environments by accounting for multi-grade classrooms and internet load-shedding.

## The Problem (#rightproblem)
Teachers in Pakistan rely on rote learning and generic textbooks. They lack the time to build engaging and highly localized lesson plans. Classrooms often combine multiple grades due to resource shortages. Internet connectivity is unstable. Existing AI tools output generic western examples that do not resonate with rural Pakistani students.

## The Target Audience (#audience)
The primary users are school teachers and principals in Punjab, Pakistan. Secondary users include parents who receive engagement cards via WhatsApp. These users need simple interfaces. They require offline resilience. They need content delivered in clear English and Roman Urdu.

# Core Epics & Features
Hyper-Local Lesson Generation: The system uses Google Gemini 2.5 Flash to generate 6-part lesson packs. These packs include a teacher guide, student handbook, class activity, quiz, homework, and parent card. The engine injects district-specific analogies like local food, landmarks, and occupations.

## Partitioned Generation Pipeline (#systemsthinking): 
Large language models fail or truncate when generating massive JSON payloads. The platform breaks the generation into four silos. It creates a shared lesson seed. It then routes that seed to independent guide, student, and assessment generators. This guarantees reliable 8k token outputs without truncation.

## Local Analogy Flywheel (Verified Context): 
Teachers can upvote effective local analogies. The system saves these to a verified_context Supabase table. Future lessons query this database to reuse high-performing analogies.

## Offline Resilience: 
The app detects internet drops. It queues generation requests locally when the user is offline. Users can process the queue once connectivity returns.

## Multi-Grade Support: 
Teachers can adjust sliders to divide a 40-minute activity into Foundation, Core, and Extension tracks. This directly addresses the reality of combined classrooms.

## Highlights

- PCTB-aligned lesson packs (teacher guide, student handbook, class
  activity, quiz, homework, parent engagement card) — one click.
- Chapter-aware weekly planner: pick chapters and topics, choose how
  many teaching days you actually have, get a day-by-day plan.
- English WhatsApp parent message generator with copy and send-to-WA
  built in.
- Hyper-local: district-aware context (Fateh Jang / Lahore / Karachi /
  Multan / Peshawar / Rawalpindi / Faisalabad / Gujranwala / Quetta /
  Sialkot).
- Premium SaaS-style UI shell with a green-dominant palette.

---

## Quick start

```bash
# 1) clone
git clone https://github.com/<your-username>/seekho-engine.git
cd seekho-engine

# 2) install
npm install

# 3) copy env template and fill in real keys
cp .env.example .env.local
#   then open .env.local and paste your real Gemini + Supabase keys

# 4) run
npm run dev
```

Open http://localhost:3000.

For the full setup walkthrough (Supabase project, schema, Vercel deploy,
smoke tests, troubleshooting) see `setup.md`.

---

## Tech stack

| Layer        | Choice                           |
| ------------ | -------------------------------- |
| Framework    | Next.js 16 (App Router)          |
| Language     | TypeScript (strict)              |
| Styling      | Tailwind CSS + custom design system |
| Database     | Supabase (Postgres + RLS)        |
| AI           | Google Gemini 2.5 Flash          |
| Toasts       | sonner                           |
| Markdown     | react-markdown + remark-gfm + KaTeX |

---

## Project structure

```
seekho-next/
├── app/
│   ├── api/                 # generate, weekly-planner, parent-whatsapp, syllabus, ...
│   ├── dashboard/           # roadmap page
│   ├── how-to-use/          # onboarding walkthrough
│   ├── week/                # plan my week (chapter-aware, day-by-day)
│   ├── print/[id]/          # printable lesson view
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── effects/             # CursorSpotlight, AuroraBackground, MagneticButton
│   ├── AppShellNav.tsx
│   ├── LessonGenerator.tsx
│   ├── WeeklyBatchPlanner.tsx
│   ├── ParentWhatsAppCard.tsx
│   └── ...
├── lib/                     # buildPrompt, supabase, classConfig, ...
├── supabase/migrations/     # SQL migrations
└── setup.md                 # full setup guide
```

---

## License

Private — all rights reserved.
