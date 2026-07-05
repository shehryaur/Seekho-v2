"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/auth/supabase-browser";

interface Props {
    initial: {
        email: string;
        full_name: string;
        school_name: string;
        district: string;
        role: string;
    };
}

export function ProfileForm({ initial }: Props) {
    const supabase = createBrowserClient();
    const [fullName, setFullName] = useState(initial.full_name);
    const [schoolName, setSchoolName] = useState(initial.school_name);
    const [district, setDistrict] = useState(initial.district);
    const [saving, setSaving] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
            toast.error("You are not signed in.");
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: fullName.trim() || null,
                school_name: schoolName.trim() || null,
                district: district.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

        setSaving(false);
        if (error) {
            toast.error(`Could not save: ${error.message}`);
        } else {
            toast.success("Profile saved");
        }
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
        window.location.href = "/";
    }

    return (
        <form onSubmit={handleSave} className="seekho-card mt-6 space-y-5 p-6 sm:p-8">
            <div>
                <label className="block text-sm font-medium text-emerald-900">
                    Email
                </label>
                <input
                    type="email"
                    value={initial.email}
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-emerald-700/20 bg-emerald-50/60 px-4 py-2.5 text-emerald-900/70 outline-none"
                />
                <p className="mt-1 text-xs text-emerald-800/60">
                    Your email is managed by your login provider and cannot be changed here.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-emerald-900">
                    Your name
                </label>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aitazaz Hassan"
                    className="mt-1.5 w-full rounded-xl border border-emerald-700/25 bg-white px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-emerald-900">
                    School name
                </label>
                <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Punjab Public School"
                    className="mt-1.5 w-full rounded-xl border border-emerald-700/25 bg-white px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-emerald-900">
                    District
                </label>
                <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Attock"
                    className="mt-1.5 w-full rounded-xl border border-emerald-700/25 bg-white px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-emerald-900">
                    Role
                </label>
                <input
                    type="text"
                    value={initial.role}
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-emerald-700/20 bg-emerald-50/60 px-4 py-2.5 text-emerald-900/70 outline-none"
                />
                <p className="mt-1 text-xs text-emerald-800/60">
                    Contact an administrator to change your role.
                </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm font-medium text-red-700 transition hover:text-red-900"
                >
                    Sign out
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="seekho-btn-primary seekho-btn-xl"
                >
                    {saving ? "Saving…" : "Save changes"}
                </button>
            </div>
        </form>
    );
}
