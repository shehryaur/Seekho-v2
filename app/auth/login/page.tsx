"use client";

/**
 * app/auth/login/page.tsx
 *
 * Magic-link login page. User enters their email. Supabase sends a
 * sign-in link. Clicking it redirects to /auth/callback which sets
 * the session cookie and sends them to /dashboard (or the ?next= URL).
 *
 * Also supports Google OAuth if enabled in Supabase.
 */

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/auth/supabase-browser";

function LoginContent() {
  const supabase = createBrowserClient();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
        <div className="seekho-card max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-900">Check your email</h1>
          <p className="mt-3 text-emerald-800/80">
            We sent a magic sign-in link to <strong>{email}</strong>.
            Click it to log in. The link expires in 1 hour.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-sm font-medium text-emerald-700 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
      <div className="seekho-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-emerald-900">Welcome to Seekho</h1>
        <p className="mt-2 text-sm text-emerald-800/70">
          Log in to generate lesson plans, save your work, and vote on local examples.
        </p>

        <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-900">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu.pk"
              className="mt-1.5 w-full rounded-xl border border-emerald-700/25 bg-white px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="seekho-btn-primary seekho-btn-xl w-full justify-center"
          >
            {loading ? "Sending link…" : "Send magic link"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-emerald-700/15" />
          <span className="text-xs text-emerald-800/50">or</span>
          <div className="h-px flex-1 bg-emerald-700/15" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-xl border border-emerald-700/25 bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
        <div className="text-emerald-900 font-medium">Loading...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}