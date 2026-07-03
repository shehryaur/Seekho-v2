/**
 * app/api/generate/route.ts
 *
 * POST -> Generate a full classroom lesson pack as strict JSON.
 *
 * v3 hardening (minimal patch over your ezyZip version):
 *   - Requires an authenticated Supabase session (401 if not logged in).
 *   - Rate-limits per user (5/min, 30/hour, 100/day) via Upstash with
 *     in-memory fallback.
 *   - Stamps user_id onto saveLesson + logAnalytics so RLS ownership works.
 *   - Audit-logs the generation event.
 *
 * The pipeline (generateLessonPipeline) is UNCHANGED — same 4-call pipeline,
 * same request/response shape, same Zod schema. This is just a thin
 * auth + quota + ownership shell around your existing working code.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type Language, type Profile } from "@/lib/buildPrompt";
import {
  getDistrict,
  getTopVerifiedSnippets,
  logAnalytics,
  saveLesson,
  type MultiGradeMix,
} from "@/lib/supabase";
import { generateLessonPipeline } from "@/lib/lessonPipeline";
import { createServerClient } from "@/lib/auth/supabase-server";
import { rateLimitMulti, QUOTAS } from "@/lib/rate-limit";
import { audit, getClientIp } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Slightly longer than 60s — the seed + 3 parallel silos finish well
// under this in practice but we leave headroom for slow networks.
export const maxDuration = 90;

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

export async function POST(req: NextRequest) {
  // ── 1. Auth: must be logged in ─────────────────────────────────────
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── 2. Rate limit: 5/min, 30/hour, 100/day per user ────────────────
  const rl = await rateLimitMulti(`generate:${user.id}`, [...QUOTAS.generate]);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "Generation quota exceeded. Please try again later.",
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // ── 3. Validate body ───────────────────────────────────────────────
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

  // ── 4. Run the UNCHANGED pipeline ──────────────────────────────────
  try {
    const district = await getDistrict(body.district);

    const verifiedContext = await getTopVerifiedSnippets({
      district: body.district,
      classNum: body.classNum,
      subject: body.subject,
      limit: 6,
    }).catch(() => [] as string[]);

    const t0 = Date.now();
    const { lesson, health } = await generateLessonPipeline({
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
    const tElapsed = Date.now() - t0;
    console.log(
      "[generate] pipeline ok",
      JSON.stringify({ ...health, ms: tElapsed }),
    );

    // v3: stamp user_id so RLS lets this user read their own lesson later
    const saved = await saveLesson({
      user_id: user.id,
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
      user_id: user.id,
      district: body.district,
      class_num: body.classNum,
      subject: body.subject,
      chapter: body.chapter,
      language: body.language,
      output_mode: "Full Lesson Pack",
      verified_context_count: verifiedContext.length,
      pipeline_ms: tElapsed,
      pipeline_guide_ok: health.guide_ok,
      pipeline_student_activity_ok: health.student_activity_ok,
      pipeline_assessment_ok: health.assessment_ok,
    });

    // v3: audit trail (best-effort, never fails the request)
    await audit({
      userId: user.id,
      action: "lesson.generate",
      resource: "generated_lessons",
      resourceId: saved?.share_token ?? undefined,
      metadata: {
        district: body.district,
        class: body.classNum,
        subject: body.subject,
        chapter: body.chapter,
        ms: tElapsed,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      lesson,
      shareToken: saved?.share_token ?? null,
      fallback: lesson._fallback === true,
      verifiedContextCount: verifiedContext.length,
      health,
    });
  } catch (error) {
    console.error("[generate] pipeline failed", error);
    return NextResponse.json(
      {
        error: "Seekho Engine could not generate this lesson right now.",
        details: String(error),
      },
      { status: 502 },
    );
  }
}
