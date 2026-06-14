import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    FileOutput,
    Layers3,
    MapPinned,
    MessageCircle,
    Sparkles,
    Wand2,
} from "lucide-react";
import { AppShellNav } from "@/components/AppShellNav";
import { AuroraBackground } from "@/components/effects/AuroraBackground";

export const metadata = {
    title: "Seekho Engine · How to Use",
};

const steps = [
    {
        icon: Layers3,
        title: "Set your classroom context",
        body: "Pick school, district, class, subject and chapter just like you already do.",
        detail: "Your district context and local examples still drive every output.",
    },
    {
        icon: Wand2,
        title: "Generate the full lesson pack",
        body: "Teacher guide, student handbook, activity, quiz, homework and parent card — all in one click.",
        detail: "Same prompt engineering. No variable names changed.",
    },
    {
        icon: MessageCircle,
        title: "Send a clean English WhatsApp update",
        body: "From the Parent tab, click Build WhatsApp message to get a structured English message parents can act on.",
        detail: "Headings: What we did in classroom, What to do at home, plus an optional note with its own copy button.",
    },
    {
        icon: MapPinned,
        title: "Plan a whole week or two",
        body: "Open Plan My Week, tick chapters and topics, choose how many teaching days you have. Seekho splits the work day-by-day.",
        detail: "Token-friendly: one compact call instead of five parallel full lesson packs.",
    },
    {
        icon: FileOutput,
        title: "Review, print and share",
        body: "Switch tabs, copy any section, print full layouts, or send key parts to WhatsApp.",
        detail: "Same printable outputs, but inside a much cleaner SaaS-style shell.",
    },
];

const proTips = [
    "On Plan My Week, prefer ticking specific topics for any chapter the class is mid-way through — Seekho will only burn tokens on what you actually want covered.",
    "Set total teaching days from the chip presets (3 / 5 / 8 / 10 / 15) so it matches how many periods you really have.",
    "On the Parent tab, hit Build WhatsApp message before sharing — it gives you clean English bullets and a separate optional note.",
    "Use the Roadmap to track which chapters are taught. Plan My Week reuses the same chapter list.",
];

export default function HowToUsePage() {
    return (
        <main className="seekho-site-shell min-h-screen bg-shell-gradient">
            <AppShellNav />

            <section className="relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="seekho-hero-pattern relative isolate overflow-hidden rounded-[2rem] border border-white/60 px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
                        <AuroraBackground intensity="soft" />
                        <div className="seekho-grid-overlay absolute inset-0 opacity-70" />
                        <div className="relative max-w-3xl">
                            <div className="seekho-badge inline-flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Interactive product walkthrough
                            </div>
                            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.04em] text-emerald-950 sm:text-6xl">
                                Learn{" "}
                                <span className="font-serif italic font-medium text-emerald-800">
                                    Seekho
                                </span>
                                <br />
                                in minutes
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/72 sm:text-lg">
                                A real onboarding surface for first-time teachers: clean steps,
                                motion, confidence and clarity.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href="/#lesson-generator"
                                    className="seekho-btn-primary seekho-btn-xl"
                                >
                                    Start using Seekho
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/week"
                                    className="seekho-btn-secondary seekho-btn-xl"
                                >
                                    Open Plan My Week
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-5">
                        <div className="seekho-section-label">Animated steps</div>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                            A smoother onboarding flow for teachers
                        </h2>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {steps.map((step, index) => (
                            <article
                                key={step.title}
                                className="seekho-card seekho-fade-up relative overflow-hidden p-6 sm:p-7"
                                style={{ animationDelay: `${index * 110}ms` }}
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400" />
                                <div className="mb-5 flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-200/60">
                                        <step.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/40">
                                            Step 0{index + 1}
                                        </div>
                                        <h3 className="text-xl font-semibold tracking-tight text-ink">
                                            {step.title}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-sm leading-6 text-ink/75">{step.body}</p>
                                <div className="mt-4 rounded-2xl border border-emerald-700/15 bg-white/65 px-4 py-3 text-sm leading-6 text-ink/70">
                                    {step.detail}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                    <aside className="seekho-card p-6 sm:p-8">
                        <div className="seekho-section-label">Teacher tips</div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                            Best-practice flow
                        </h2>
                        <div className="mt-5 space-y-3">
                            {proTips.map((tip) => (
                                <div
                                    key={tip}
                                    className="flex items-start gap-3 rounded-2xl border border-emerald-700/15 bg-white/70 px-4 py-3"
                                >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <span className="text-sm leading-6 text-ink/78">{tip}</span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="seekho-card p-6 sm:p-8">
                        <div className="seekho-section-label">Suggested app structure</div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                            Where to click next
                        </h2>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <Link
                                href="/#lesson-generator"
                                className="rounded-[1.5rem] border border-emerald-700/15 bg-white/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-700/35 hover:bg-white/90"
                            >
                                <div className="text-sm font-semibold text-ink">Generator</div>
                                <p className="mt-2 text-sm leading-6 text-ink/70">
                                    Main entry point for one daily lesson.
                                </p>
                            </Link>
                            <Link
                                href="/dashboard"
                                className="rounded-[1.5rem] border border-emerald-700/15 bg-white/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-700/35 hover:bg-white/90"
                            >
                                <div className="text-sm font-semibold text-ink">Roadmap</div>
                                <p className="mt-2 text-sm leading-6 text-ink/70">
                                    Track chapter coverage across the term.
                                </p>
                            </Link>
                            <Link
                                href="/week"
                                className="rounded-[1.5rem] border border-emerald-700/15 bg-white/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-700/35 hover:bg-white/90"
                            >
                                <div className="text-sm font-semibold text-ink">
                                    Plan My Week
                                </div>
                                <p className="mt-2 text-sm leading-6 text-ink/70">
                                    Chapter-aware day-by-day planner.
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
