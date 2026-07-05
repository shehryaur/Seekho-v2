/**
 * middleware.ts — Edge middleware running on every request.
 *
 * 1. Refreshes Supabase auth tokens (so server components see a valid session).
 * 2. Gates protected routes:
 *      Pages:  /dashboard, /admin/**
 *      APIs:   /api/generate, /api/analogy
 *    Unauthenticated → redirect (pages) or 401 (APIs).
 * 3. Injects strict security headers (CSP, HSTS, X-Frame-Options, etc.).
 * 4. CSRF defense: mutating API requests must have same-origin Origin header.
 *
 * NOTE: Your public pages (/, /how-to-use, /plan, /week, /print, /api/syllabus,
 * /api/weekly-planner, /api/parent-whatsapp, /api/remediation) are NOT gated
 * and continue to work exactly as before.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/profile"];

const PROTECTED_API_PREFIXES = ["/api/generate", "/api/analogy"];
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/callback",
  "/auth/signout",
  "/api/inngest",
];

function isProtectedPage(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}
function isProtectedApi(pathname: string) {
  return PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
}
function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ── 1. CSRF defense: mutating API requests must be same-origin ──────
  const method = request.method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (isMutation && request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const exempt =
      request.nextUrl.pathname.startsWith("/api/inngest") ||
      request.nextUrl.pathname.startsWith("/api/webhook");
    if (!exempt && origin) {
      try {
        const originHost = new URL(origin).host;
        if (host && originHost !== host) {
          return NextResponse.json(
            { error: "Cross-origin request blocked." },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid origin header." },
          { status: 403 },
        );
      }
    }
  }

  // ── 2. Supabase auth refresh ────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 3. Protected page gating ────────────────────────────────────────
  if (!user && isProtectedPage(pathname) && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── 4. Protected API gating ─────────────────────────────────────────
  if (!user && isProtectedApi(pathname)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  // ── 5. Security headers ─────────────────────────────────────────────
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.inngest.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://*.upstash.io https://*.inngest.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
