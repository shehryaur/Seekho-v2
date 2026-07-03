/**
 * app/auth/signout/route.ts
 *
 * POST → sign out the current user and redirect to /auth/login.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-server";

export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), {
    status: 302,
  });
}
