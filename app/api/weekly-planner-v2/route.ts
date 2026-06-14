/**
 * app/api/weekly-planner-v2/route.ts
 *
 * NEW endpoint. Teacher specifies:
 *   - which chapters
 *   - what % coverage they want for each chapter THIS WEEK
 *   - how many teaching days they have
 *   - minutes per period
 *
 * AI returns a structured day-by-day grid (warmup / core_teach / practice /
 * exit_ticket) that fits the constraints.
 *
 * Schema-constrained, so it cannot return malformed JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { getDistrict, getTopVerifiedSnippets } from "@/lib/supabase";
import { WEEK_PLAN_V2_SCHEMA } from "@/lib/lessonSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
    district: z.string().min(1),
    classNum: z.number().int().min(1).max(12),
    subject: z.string().min(1),
    daysAvailable: z.number().int().min(1).max(6),
    minutesPerPeriod: z.number().int().min(30).max(120),
    chapters: z
        .array(
            z.object({
                name: z.string().min(1),
                coveragePct: z.number().int().min(10).max(100),
            }),
        )
        .min(1)
        .max(8),
});

let client: GoogleGenerativeAI | null = null;
function ai() {
    if (client) return client;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    client = new GoogleGenerativeAI(key);
    return client;
}

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

    const chapterPlan = body.chapters
        .map(
            (c, i) =>
                `  ${i + 1}. "${c.name}" -- aim to cover ${c.coveragePct}% of this chapter this week.`,
        )
        .join("\n");

    const verifiedBlock =
        verifiedContext.length > 0
            ? `\n\nLOCAL TEACHER-VERIFIED CONTEXT (imitate this tone and locality):\n${verifiedContext
                .map((s, i) => `  [${i + 1}] ${s}`)
                .join("\n")}\n`
            : "";

    const prompt = `You are Seekho Engine, a curriculum planner for Pakistani classrooms.

CONTEXT
School district: ${district.name}, ${district.province}
Board: ${district.board}
Class level: ${body.classNum}
Subject: ${body.subject}
Local realities: ${district.connectivity}; transport ${district.transport}.
Common student names to use in examples: ${district.local_names}.
${verifiedBlock}

WEEKLY CONSTRAINTS
- Teacher has ${body.daysAvailable} teaching day(s) this week.
- Each period is ${body.minutesPerPeriod} minutes long.
- Total instruction time = ${body.daysAvailable * body.minutesPerPeriod} minutes.

CHAPTERS AND COVERAGE TARGETS
${chapterPlan}

YOUR JOB
Split the listed chapter slices across exactly ${body.daysAvailable} days. Each
day must include:
  - warmup: a 5-minute warm-up script the teacher reads aloud.
  - core_teach: the main teaching plan (board work, worked examples, 2-3
    questions to ask, common misconceptions to address).
  - practice: 3-6 student practice problems with answers embedded inline,
    increasing in difficulty.
  - exit_ticket: exactly 3 short questions that prove today's slice was
    understood. Students answer in the last 3 minutes.
  - topic_slice: which sections of which chapter are covered this day.
  - estimated_minutes: should be <= ${body.minutesPerPeriod}.

RULES
- Be specific. Use real examples from ${district.name}: ${district.economy},
  ${district.food}, ${district.landmarks}.
- Match the board exam expectations of ${district.board}.
- Practice problems must be solvable with chalk, paper, and notebooks only.
- weekly_summary: 2-3 sentences a teacher can show the principal.

Output strictly matches the response schema. No prose outside the JSON.`;

    const model = ai().getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: WEEK_PLAN_V2_SCHEMA as unknown as object,
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
                warmup: string;
                core_teach: string;
                practice: string;
                exit_ticket: string;
                estimated_minutes?: number;
            }>;
            weekly_summary: string;
        };

        return NextResponse.json({
            ok: true,
            days: parsed.days,
            weekly_summary: parsed.weekly_summary,
            meta: {
                district: district.name,
                classNum: body.classNum,
                subject: body.subject,
                daysAvailable: body.daysAvailable,
                minutesPerPeriod: body.minutesPerPeriod,
            },
        });
    } catch (error) {
        console.error("[weekly-planner-v2] failed", error);
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
