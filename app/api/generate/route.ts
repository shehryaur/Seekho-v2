/**
 * app/api/generate/route.ts
 *
 * POST -> Generate a full classroom lesson pack as strict JSON.
 *
 * v3 fix: Uses Gemini's schema-constrained decoding (`responseSchema`).
 *         Eliminates the entire class of "JSON parsing failed" errors that
 *         used to crash the Quiz tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  buildPrompt,
  parseLessonJson,
  type Language,
  type Profile,
} from "@/lib/buildPrompt";
import {
  getDistrict,
  getTopVerifiedSnippets,
  logAnalytics,
  saveLesson,
  type MultiGradeMix,
} from "@/lib/supabase";
import { LESSON_SCHEMA } from "@/lib/lessonSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  school: z.string().min(1),
  district: z.string().min(1),
  classNum: z.number().int().min(1).max(12),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  topic: z.string().optional().default(""),
  language: z.enum([
    "English",
    "Roman Urdu",
    "Pure Urdu (Script)",
  ]) satisfies z.ZodType<Language>,
  profile: z.enum([
    "Standard",
    "Weak Class (Below Average)",
    "Strong Class (Above Average)",
  ]) satisfies z.ZodType<Profile>,
  extra: z.string().optional().default(""),
  topicsList: z.array(z.string()).optional().default([]),
  urduTranslate: z.boolean().optional().default(false),
  lowResource: z.boolean().optional().default(false),
  inventory: z.array(z.string()).optional().default([]),
  multiGrade: z
    .object({
      enabled: z.boolean(),
      belowGrade: z.number(),
      atGrade: z.number(),
      aboveGrade: z.number(),
    })
    .optional() as z.ZodType<MultiGradeMix | undefined>,
});

let client: GoogleGenerativeAI | null = null;
function ai() {
  if (client) return client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing.");
  client = new GoogleGenerativeAI(key);
  return client;
}

const MODEL_NAME = "gemini-flash-latest";

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details:
          error instanceof z.ZodError ? error.flatten() : String(error),
      },
      { status: 400 },
    );
  }

  try {
    const district = await getDistrict(body.district);

    const verifiedContext = await getTopVerifiedSnippets({
      district: body.district,
      classNum: body.classNum,
      subject: body.subject,
      limit: 6,
    }).catch(() => [] as string[]);

    const prompt = buildPrompt({
      school: body.school,
      district,
      classNum: body.classNum,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      language: body.language,
      profile: body.profile,
      extra: body.extra,
      topicsList: body.topicsList,
      urduTranslate: body.urduTranslate,
      lowResource: body.lowResource,
      inventory: body.inventory,
      multiGrade: body.multiGrade,
      verifiedContext,
    });

    const model = ai().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: LESSON_SCHEMA as unknown as object,
        temperature: 0.65,
        maxOutputTokens: 8192,
      },
    });

    const response = await model.generateContent(prompt);
    const lesson = parseLessonJson(response.response.text());

    const saved = await saveLesson({
      school_name: body.school,
      district: body.district,
      class_num: body.classNum,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic || "Full Chapter Overview",
      language: body.language,
      output_mode: "Full Lesson Pack",
      class_profile: body.profile,
      content: JSON.stringify(lesson),
      inventory: body.inventory,
      multi_grade_enabled: Boolean(body.multiGrade?.enabled),
      multi_grade_mix: body.multiGrade,
      homework_json: lesson.homework ?? null,
      parent_engagement_card: lesson.parent_engagement_card ?? null,
      parent_card_generated: Boolean(lesson.parent_engagement_card),
    });

    await logAnalytics({
      district: body.district,
      class_num: body.classNum,
      subject: body.subject,
      chapter: body.chapter,
      language: body.language,
      output_mode: "Full Lesson Pack",
      verified_context_count: verifiedContext.length,
    });

    return NextResponse.json({
      lesson,
      shareToken: saved?.share_token ?? null,
      fallback: lesson._fallback === true,
      verifiedContextCount: verifiedContext.length,
    });
  } catch (error) {
    console.error("[generate] failed", error);
    return NextResponse.json(
      {
        error: "Seekho Engine could not generate this lesson right now.",
        details: String(error),
      },
      { status: 502 },
    );
  }
}
