/**
 * lib/auth/supabase-browser.ts
 *
 * Browser-side Supabase client for client components (login page, sign-out, etc).
 * Reads the same auth cookies as the server client.
 */

import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
