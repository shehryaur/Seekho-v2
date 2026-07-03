/**
 * lib/auth/supabase-server.ts
 *
 * Server-side Supabase client that reads auth cookies set by middleware.
 * Use this in Route Handlers and Server Components to get the logged-in user.
 *
 * Also exports:
 *   - createServiceClient()  — service-role client (bypasses RLS). Only for
 *     server-only trusted operations like Inngest workers.
 *   - requireUser()  — redirects to /auth/login if not logged in.
 *   - requireAdmin() — redirects to /auth/login if not an admin.
 */

import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * User-scoped client. Respects RLS — can only read/write rows the current
 * user owns. Reads auth cookies that middleware refreshed.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies can't be set.
            // Middleware will refresh the session on the next request.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. BYPASSES RLS. Use ONLY in server-only contexts where
 * you need privileged access (Inngest worker, seed scripts). NEVER expose
 * the service key to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns the current user or redirects to /auth/login.
 */
export async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return user;
}

/**
 * Returns the current user if they have role='admin' in profiles,
 * otherwise redirects to /auth/login.
 */
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    redirect("/auth/login");
  }
  return user;
}
