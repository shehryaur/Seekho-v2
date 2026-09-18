# Seekho Engine

Seekho Engine is a Next.js curriculum platform that helps Pakistani teachers generate localized, PCTB-aligned lesson materials in under a minute. It turns class, subject, chapter, district, and classroom constraints into a full lesson package: teacher guide, student handout, activity, quiz, parent message, and weekly planning support.

## Why Seekho Exists

Teachers often need to prepare board-aligned lessons for large classes, mixed ability levels, limited materials, and unstable internet. Generic AI tools can help, but they usually miss local context and produce examples that feel distant from students' lives.

Seekho focuses on the real classroom: local analogies, printable formats, WhatsApp sharing, low-resource activities, and PCTB chapter structure.

## Features

- PCTB-aligned lesson generation for Classes 1-12.
- District-aware examples for cities and regions across Pakistan.
- Teacher guide, student handbook, class activity, quiz, and answer key.
- Chapter-aware weekly planner.
- Parent WhatsApp message generator.
- Local analogy system for reusable classroom context.
- Remediation workflows for improving generated lesson quality.
- Supabase-backed persistence and analytics.
- Responsive SaaS-style interface built for fast lesson preparation.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase |
| AI | Google Gemini |
| Background workflows | Inngest |
| Rate limiting | Upstash |
| UI | React 19, lucide-react, sonner |
| Markdown/math | react-markdown, remark-gfm, KaTeX |

## App Structure

```text
app/
  api/                 AI generation, syllabus, weekly planner, parent messages
  dashboard/           Syllabus roadmap
  how-to-use/          Product walkthrough
  week/                Weekly lesson planning
  print/[id]/          Printable lesson output
components/           App shell, lesson generator, planner, cards, effects
lib/                  Prompt builders, Supabase client, class config, utilities
supabase/migrations/  Database migrations
setup.md              Full setup and deployment guide
```

## Quick Start

```bash
git clone https://github.com/shehryaur/Seekho-v2.git
cd Seekho-v2
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Add your Gemini, Supabase, Upstash, and deployment-specific variables in `.env.local`. See `setup.md` for the full walkthrough.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # run production server
npm run lint     # lint checks
```

## Product Principles

- Local examples beat generic examples.
- Teachers should be able to print, share, or adapt output immediately.
- Low-resource classrooms are a first-class constraint.
- AI output should stay reviewable and editable by the teacher.
- Board alignment matters, but classroom usability matters just as much.

## Status

Seekho Engine is an active product prototype. Generated material should be reviewed before classroom use, especially assessments, Urdu output, and board-specific details.

## License

Private - all rights reserved.
