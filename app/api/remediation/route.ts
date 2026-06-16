

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  getDistrict,
  getLessonByToken,
  type LessonJson,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const LessonJsonSchema = z
  .object({
    teacher_guide: z.string(),
    student_handbook: z.string(),
    class_activity: z.string(),
    quiz: z.object({ questions: z.string(), answer_key: z.string() }),
  })
  .passthrough();

const Body = z
  .object({
    shareToken: z.string().optional(),
    lessonJson: LessonJsonSchema.optional(),
    district: z.string().min(1),
    classNum: z.number().int().min(1).max(12),
    subject: z.string().min(1),
    chapter: z.string().min(1),
    language: z.enum(["English", "Roman Urdu", "Pure Urdu (Script)"]),
    diagnostics: z.string().min(5),
    averageScore: z.number().min(0).max(100),
    lessonWentWell: z.enum(["Yes", "Partially", "No"]),
  })
  .refine((value) => value.shareToken || value.lessonJson, {
    message: "Either shareToken or lessonJson is required",
    path: ["shareToken"],
  });

let client: GoogleGenerativeAI | null = null;
function ai() {
  if (client) return client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  client = new GoogleGenerativeAI(key);
  return client;
}

/**
 * Assessment Root Cause Classifier.
 *
 *   Delivery Gap        — Students didn't learn, lesson didn't land.
 *   Curriculum Gap      — Lesson was clear, but students still failed
 *                         (concept may be ahead of class level).
 *   Assessment Mismatch — Students did well in class but quiz felt off
 *                         (or scored high while teacher felt it was rough).
 */
function classifyRootCause(
  averageScore: number,
  lessonWentWell: "Yes" | "Partially" | "No",
) {
  if (averageScore < 45 && lessonWentWell !== "Yes") return "Delivery Gap";
  if (averageScore < 45 && lessonWentWell === "Yes") return "Curriculum Gap";
  if (averageScore >= 70 && lessonWentWell !== "Yes")
    return "Assessment Mismatch";
  if (averageScore >= 55 && lessonWentWell === "Yes")
    return "Assessment Mismatch";
  return lessonWentWell === "Partially" ? "Delivery Gap" : "Curriculum Gap";
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
          error instanceof z.ZodError
            ? error.flatten()
            : String(error),
      },
      { status: 400 },
    );
  }

  let lesson: LessonJson | null = body.lessonJson ?? null;
  if (!lesson && body.shareToken) {
    const row = await getLessonByToken(body.shareToken);
    if (row) {
      try {
        lesson = JSON.parse(row.content) as LessonJson;
      } catch {
        lesson = null;
      }
    }
  }
  if (!lesson) {
    return NextResponse.json(
      { error: "Could not load the original lesson." },
      { status: 404 },
    );
  }

  const district = await getDistrict(body.district);
  const classification = classifyRootCause(
    body.averageScore,
    body.lessonWentWell,
  );

  const prompt = `
You are SEEKHO ENGINE.
A teacher in ${district.name} taught Class ${body.classNum} ${body.subject}, chapter ${body.chapter}.

ROOT CAUSE CLASSIFICATION: ${classification}
AVERAGE SCORE: ${body.averageScore}%
TEACHER SELF-ASSESSMENT: ${body.lessonWentWell}

DIAGNOSTIC NOTES:
${body.diagnostics.trim()}

ORIGINAL QUIZ:
${lesson.quiz.questions}

LOCAL CONTEXT:
Landmarks:   ${district.landmarks}
Food:        ${district.food}
Occupations: ${district.occupations}
Local names: ${district.local_names}

TASK:
Write a precise 10-minute remediation plan in ${body.language}. It must include:
1. Pinpoint the misconception in under 60 words.
2. Explain why this is specifically a ${classification}.
3. Give a 3-minute reteach using a fresh local analogy.
4. Give a 4-minute check-for-understanding with exactly two new mini-questions.
5. Give a 3-minute close with one sentence the teacher can read aloud.

Rules:
- Use headings and bullet points.
- No paragraph walls.
- No em dashes.
- Do not repeat any original quiz item word for word.
- Return markdown only.
`;

  try {
    const model = ai().getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
    });
    const response = await model.generateContent(prompt);
    return NextResponse.json({
      classification,
      remediation: response.response.text(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Seekho Engine could not generate remediation right now.",
        details: String(error),
      },
      { status: 502 },
    );
  }
}
