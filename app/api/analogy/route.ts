/**
 * app/api/analogy/route.ts
 *
 * POST → Save an AUTHENTICATED teacher thumbs-up to `verified_context`.
 *
 * v3 hardening (minimal patch over your ezyZip version):
 *   - Requires an authenticated Supabase session (401 if not logged in).
 *   - Rate-limits per user (30/min, 200/hour).
 *   - Sanitizes snippet before insert.
 *   - Audit-logs the vote.
 *   - Delegates to saveVerifiedSnippet(userId, …) — now per-user idempotent.
 *
 * Frontend response shape is unchanged: { ok: true, votes: number }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveVerifiedSnippet } from "@/lib/supabase";
import { createServerClient } from "@/lib/auth/supabase-server";
import { rateLimitMulti, QUOTAS } from "@/lib/rate-limit";
import { audit, getClientIp } from "@/lib/db/audit";
import { sanitizeSnippet } from "@/lib/sanitize";

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
  // ── 1. Auth ────────────────────────────────────────────────────────
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

  // ── 2. Rate limit ──────────────────────────────────────────────────
  const rl = await rateLimitMulti(`analogy:${user.id}`, [...QUOTAS.analogy]);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many votes. Please slow down.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // ── 3. Validate ────────────────────────────────────────────────────
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

  const cleanSnippet = sanitizeSnippet(body.snippet);
  if (cleanSnippet.length < 8) {
    return NextResponse.json(
      { error: "Snippet too short after sanitization" },
      { status: 400 },
    );
  }

  // ── 4. Write ───────────────────────────────────────────────────────
  const result = await saveVerifiedSnippet({
    userId: user.id,
    district: body.district,
    classNum: body.classNum ?? null,
    subject: body.subject ?? null,
    section: body.section,
    snippet: cleanSnippet,
  });

  if (!result) {
    return NextResponse.json(
      { error: "Could not record your vote." },
      { status: 502 },
    );
  }

  // ── 5. Audit ───────────────────────────────────────────────────────
  await audit({
    userId: user.id,
    action: "analogy.vote",
    resource: "verified_context",
    metadata: { district: body.district, section: body.section },
    ipAddress: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true, votes: result.votes });
}
