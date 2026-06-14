/**
 * app/api/weekly-planner/route.ts
 *
 * NEW chapter-aware weekly planner.
 *
 * Replaces the old "fan out 5 full lesson packs in parallel" approach (which
 * was extremely token-heavy and frequently got stopped mid-flight).
 *
 * New input shape:
 *   {
 *     district, classNum, subject,
 *     totalDays: number (1..15),
 *     chapters: [{ name, topics: string[], fullChapter: boolean }],
 *     extra?: string
 *   }
 *
 * The model receives ONE compact prompt and returns ONE compact JSON plan
 * that breaks the requested chapters into exactly `totalDays` day-by-day
 * teaching slices (warm-up, idea, activity, practice, exit ticket).
 *
 * This is ~1/5 the tokens of the previous approach and finishes in a single
 * round-trip.
 *
 * NOTE: Variable names, helper imports, and prompt-engineering primitives
 * (buildPrompt-style locality block, getDistrict, getTopVerifiedSnippets)
 * are NOT changed — they're still imported and used the same way.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";
import { getDistrict, getTopVerifiedSnippets } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ChapterInput = z.object({
  name: z.string().min(1),
  topics: z.array(z.string()).default([]),
  fullChapter: z.boolean().default(false),
});

const Body = z.object({
  school: z.string().optional().default("School"),
  district: z.string().min(1),
  classNum: z.number().int().min(1).max(12),
  subject: z.string().min(1),
  totalDays: z.number().int().min(1).max(15),
  minutesPerPeriod: z.number().int().min(20).max(120).optional().default(40),
  chapters: z.array(ChapterInput).min(1).max(6),
  extra: z.string().optional().default(""),
});

let client: GoogleGenerativeAI | null = null;
function ai() {
  if (client) return client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  client = new GoogleGenerativeAI(key);
  return client;
}

const WEEKLY_DAY_PLAN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day_number: { type: SchemaType.NUMBER },
          day_label: { type: SchemaType.STRING },
          chapter: { type: SchemaType.STRING },
          topic_slice: { type: SchemaType.STRING },
          objective: { type: SchemaType.STRING },
          warmup: { type: SchemaType.STRING },
          core_teach: { type: SchemaType.STRING },
          activity: { type: SchemaType.STRING },
          practice: { type: SchemaType.STRING },
          exit_ticket: { type: SchemaType.STRING },
          homework: { type: SchemaType.STRING },
          estimated_minutes: { type: SchemaType.NUMBER },
        },
        required: [
          "day_number",
          "day_label",
          "chapter",
          "topic_slice",
          "objective",
          "warmup",
          "core_teach",
          "activity",
          "practice",
          "exit_ticket",
        ],
      },
    },
    weekly_summary: { type: SchemaType.STRING },
    coverage_notes: { type: SchemaType.STRING },
  },
  required: ["days", "weekly_summary"],
} as const;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid body",
        details:
          error instanceof z.ZodError ? error.flatten() : String(error),
      },
      { status: 400 },
    );
  }

  const district = await getDistrict(body.district);
  const verifiedContext = await getTopVerifiedSnippets({
    district: body.district,
    classNum: body.classNum,
    subject: body.subject,
    limit: 4,
  }).catch(() => [] as string[]);

  const chapterList = body.chapters
    .map((ch, i) => {
      const scope = ch.fullChapter
        ? "FULL CHAPTER (cover every topic in this chapter)"
        : ch.topics.length > 0
          ? `SELECTED TOPICS ONLY: ${ch.topics.map((t) => `"${t}"`).join(", ")}`
          : "FULL CHAPTER (no topics specified)";
      return `  ${i + 1}. Chapter: "${ch.name}"\n     Scope: ${scope}`;
    })
    .join("\n");

  const verifiedBlock =
    verifiedContext.length > 0
      ? `\nLOCAL TEACHER-VERIFIED EXAMPLES (imitate this tone and locality):\n${verifiedContext
        .map((s, i) => `  [${i + 1}] ${s}`)
        .join("\n")}\n`
      : "";

  const prompt = `You are SEEKHO ENGINE, a Pakistani classroom planning expert.

SCHOOL CONTEXT
School: ${body.school} | District: ${district.name} | Board: ${district.board ?? "BISE"}
Class: ${body.classNum} | Subject: ${body.subject}
Local economy: ${district.economy}
Local landmarks: ${district.landmarks}
Local food: ${district.food}
Local names to use in examples: ${district.local_names}

TEACHING WINDOW
Total teaching days available: ${body.totalDays}
Each day has one period of about ${body.minutesPerPeriod} minutes.

CHAPTERS THE TEACHER WANTS TO DELIVER
${chapterList}
${verifiedBlock}
EXTRA INSTRUCTIONS: ${body.extra.trim() || "None."}

YOUR JOB
1. Split the requested chapters / topics into EXACTLY ${body.totalDays} day-by-day teaching slices.
   - If the teacher gave you multiple chapters, distribute the days fairly so each chapter's selected scope finishes inside the window.
   - If the teacher selected only some topics in a chapter, ONLY cover those topics for that chapter. Do not invent extra topics.
   - If the teacher chose "Full Chapter", cover the whole chapter in order.
2. Each day must follow this pedagogical arc:
     Day 1 of any new chapter -> prerequisites + hook
     Middle days             -> core idea & concept, then activity, then guided practice
     Last day of a chapter   -> consolidation + exit ticket + short homework
3. Every day MUST include:
     objective       (one sentence, what students will be able to do by end of class)
     warmup          (5 min, the teacher reads aloud)
     core_teach      (markdown: explanation, board work, 2-3 questions to ask, common misconceptions)
     activity        (one short class activity using only chalk, paper, notebooks)
     practice        (3-5 short problems with answers inline, increasing difficulty)
     exit_ticket     (3 short questions, last 3 minutes)
     homework        (one short homework task, optional but recommended)
     topic_slice     (which sections of which chapter are covered today)
     estimated_minutes (<= ${body.minutesPerPeriod})
4. Use ${district.name} examples (landmarks, food, names) inside every day's content.
5. NO em dashes. Use bullets, short paragraphs, and tables where useful.
6. Output ONLY the JSON that fits the response schema. Nothing else.`;

  const model = ai().getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: WEEKLY_DAY_PLAN_SCHEMA as unknown as object,
      temperature: 0.55,
      maxOutputTokens: 8192,
    },
  });

  try {
    const response = await model.generateContent(prompt);
    const raw = response.response.text();
    const parsed = JSON.parse(raw) as {
      days: Array<{
        day_number: number;
        day_label: string;
        chapter: string;
        topic_slice: string;
        objective: string;
        warmup: string;
        core_teach: string;
        activity: string;
        practice: string;
        exit_ticket: string;
        homework?: string;
        estimated_minutes?: number;
      }>;
      weekly_summary: string;
      coverage_notes?: string;
    };

    return NextResponse.json({
      ok: true,
      days: parsed.days,
      weekly_summary: parsed.weekly_summary,
      coverage_notes: parsed.coverage_notes ?? "",
      meta: {
        district: district.name,
        classNum: body.classNum,
        subject: body.subject,
        totalDays: body.totalDays,
        minutesPerPeriod: body.minutesPerPeriod,
      },
    });
  } catch (error) {
    console.error("[weekly-planner] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Seekho Engine could not build this weekly plan.",
        details: String(error),
      },
      { status: 502 },
    );
  }
}
