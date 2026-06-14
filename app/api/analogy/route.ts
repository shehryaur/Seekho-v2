/**
 * app/api/analogy/route.ts
 *
 * POST → Save a teacher thumbs-up to the `verified_context` table.
 *
 * Body: { district, classNum?, subject?, section, snippet }
 *   - section is one of: teacher | student | activity | quiz | homework | parent
 *   - snippet is the exact text the teacher liked (max ~1200 chars trimmed)
 *
 * Returns: { ok: true, votes: number }
 *
 * Used by the "Local Analogy Flywheel" feature — see components/LessonGenerator.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveVerifiedSnippet } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  district: z.string().min(1),
  classNum: z.number().int().min(1).max(12).optional().nullable(),
  subject: z.string().optional().nullable(),
  section: z.string().min(1).max(40),
  snippet: z.string().min(8).max(1200),
});

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

  const result = await saveVerifiedSnippet({
    district: body.district,
    classNum: body.classNum ?? null,
    subject: body.subject ?? null,
    section: body.section,
    snippet: body.snippet,
  });

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Could not record your vote (Supabase not configured or write failed).",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, votes: result.votes });
}
