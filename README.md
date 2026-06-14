# Seekho Engine

Hyper-local AI lesson planning and curriculum support for Pakistani teachers.

Built on Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase
(Postgres), and Google Gemini 2.5 Flash.

---

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
