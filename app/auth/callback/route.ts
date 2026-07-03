/**
 * app/auth/callback/route.ts
 *
 * Supabase redirects here after the user clicks the magic link (or completes
 * Google OAuth). We exchange the code for a session, then redirect to the
 * `next` param (default /dashboard).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchange error:", error.message);
  }

  // If no code or exchange failed, send back to login with an error flag
  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
