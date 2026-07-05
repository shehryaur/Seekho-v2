import { requireUser, createServerClient } from "@/lib/auth/supabase-server";
import { AppShellNav } from "@/components/AppShellNav";
import { ProfileForm } from "./ProfileForm";

export const metadata = {
    title: "Seekho Engine · Profile Settings",
};

export default async function ProfilePage() {
    const user = await requireUser();
    const supabase = await createServerClient();

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    return (
        <main className="min-h-screen bg-shell-gradient">
            <AppShellNav />
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="seekho-section-label">Account</div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-emerald-950">
                    Profile settings
                </h1>
                <p className="mt-2 text-sm text-emerald-800/70">
                    Tell us about your school. This information is used to pre-fill lesson
                    generation forms and is never shared.
                </p>

                <ProfileForm
                    initial={{
                        email: user.email ?? "",
                        full_name: profile?.full_name ?? "",
                        school_name: profile?.school_name ?? "",
                        district: profile?.district ?? "",
                        role: profile?.role ?? "teacher",
                    }}
                />
            </div>
        </main>
    );
}
