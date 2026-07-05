"use client";

/**
 * components/UserMenu.tsx
 *
 * Top-right nav control. If the user is signed out → "Log in" button.
 * If signed in → circular avatar (initial letter) that opens a small
 * dropdown with the user's email, a "Profile settings" link, and Sign out.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, User as UserIcon, Settings } from "lucide-react";
import { createBrowserClient } from "@/lib/auth/supabase-browser";
import type { User } from "@supabase/supabase-js";

export function UserMenu() {
    const supabase = createBrowserClient();
    const [user, setUser] = useState<User | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load current session
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user ?? null);
            setLoading(false);
        });

        // Listen for login/logout changes
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, [supabase]);

    // Close dropdown on outside click
    useEffect(() => {
        function onClickAway(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickAway);
        return () => document.removeEventListener("mousedown", onClickAway);
    }, []);

    async function handleSignOut() {
        await supabase.auth.signOut();
        setOpen(false);
        // Send them home
        window.location.href = "/";
    }

    if (loading) {
        return (
            <div className="h-10 w-10 rounded-full bg-emerald-900/10 animate-pulse" />
        );
    }

    if (!user) {
        return (
            <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/30 bg-white/70 px-3.5 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
            >
                <LogIn className="h-4 w-4" />
                Log in
            </Link>
        );
    }

    const initial =
        (user.user_metadata?.full_name ?? user.email ?? "?")
            .toString()
            .trim()
            .charAt(0)
            .toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label="User menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
            >
                {initial}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-emerald-700/20 bg-white p-2 shadow-2xl">
                    <div className="px-3 py-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-emerald-800/60">
                            Signed in as
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-emerald-900">
                            {user.email}
                        </div>
                    </div>

                    <div className="my-1 h-px bg-emerald-700/10" />

                    <Link
                        href="/profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                    >
                        <Settings className="h-4 w-4" />
                        Profile settings
                    </Link>

                    <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                    >
                        <UserIcon className="h-4 w-4" />
                        Syllabus Roadmap
                    </Link>

                    <div className="my-1 h-px bg-emerald-700/10" />

                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
