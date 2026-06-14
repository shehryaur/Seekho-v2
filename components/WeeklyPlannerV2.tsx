"use client";

/**
 * components/WeeklyPlannerV2.tsx
 *
 * NEW 3-step wizard:
 *   Step 1 -> Setup (class, subject, district, days available, period length)
 *   Step 2 -> Chapter targets (pick chapters + % coverage each)
 *   Step 3 -> AI-generated day-by-day plan with per-day regenerate
 *
 * Mount this on a page (e.g. app/plan/page.tsx) -- see plan-page.tsx below.
 */

import * as React from "react";
import { toast } from "sonner";
import { EscapeHatchSelect } from "./EscapeHatchSelect";
import { MarkdownRenderer } from "./MarkdownRenderer";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const DISTRICTS = [
    "Fateh Jang / Attock",
    "Lahore",
    "Multan",
    "Rawalpindi / Islamabad",
    "Faisalabad",
];
const DAYS_OPTIONS = ["3", "4", "5", "6"];
const PERIOD_OPTIONS = ["35", "40", "45", "60"];
const COVERAGE_OPTIONS = [25, 50, 75, 100];

interface ChapterTarget {
    name: string;
    coveragePct: number;
}

interface DayPlan {
    day_number: number;
    day_label: string;
    chapter: string;
    topic_slice: string;
    warmup: string;
    core_teach: string;
    practice: string;
    exit_ticket: string;
    estimated_minutes?: number;
}

export default function WeeklyPlannerV2() {
    const [step, setStep] = React.useState<1 | 2 | 3>(1);

    // Step 1 state
    const [district, setDistrict] = React.useState("Fateh Jang / Attock");
    const [classNum, setClassNum] = React.useState("8");
    const [subject, setSubject] = React.useState("");
    const [subjects, setSubjects] = React.useState<string[]>([]);
    const [daysAvailable, setDaysAvailable] = React.useState("5");
    const [minutesPerPeriod, setMinutesPerPeriod] = React.useState("40");

    // Step 2 state
    const [availableChapters, setAvailableChapters] = React.useState<string[]>([]);
    const [selectedChapters, setSelectedChapters] = React.useState<ChapterTarget[]>([]);

    // Step 3 state
    const [generating, setGenerating] = React.useState(false);
    const [plan, setPlan] = React.useState<DayPlan[]>([]);
    const [weeklySummary, setWeeklySummary] = React.useState("");

    // Load subjects when class changes
    React.useEffect(() => {
        fetch(`/api/syllabus?classNum=${classNum}`)
            .then((r) => r.json())
            .then((d) => setSubjects(d.subjects ?? []))
            .catch(() => setSubjects([]));
    }, [classNum]);

    // Load chapters when subject changes
    React.useEffect(() => {
        if (!subject) return;
        fetch(
            `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(subject)}`,
        )
            .then((r) => r.json())
            .then((d) => setAvailableChapters(d.chapters ?? []))
            .catch(() => setAvailableChapters([]));
    }, [classNum, subject]);

    function toggleChapter(name: string) {
        setSelectedChapters((prev) => {
            const exists = prev.find((c) => c.name === name);
            if (exists) return prev.filter((c) => c.name !== name);
            return [...prev, { name, coveragePct: 100 }];
        });
    }

    function setCoverage(name: string, pct: number) {
        setSelectedChapters((prev) =>
            prev.map((c) => (c.name === name ? { ...c, coveragePct: pct } : c)),
        );
    }

    // Heuristic: total work units = sum of coveragePct; available units = days * 100.
    const totalCoverage = selectedChapters.reduce(
        (acc, c) => acc + c.coveragePct,
        0,
    );
    const dayBudget = Number(daysAvailable) * 100;
    const fits = totalCoverage <= dayBudget;
    const loadPct = dayBudget === 0 ? 0 : Math.round((totalCoverage / dayBudget) * 100);

    async function generatePlan() {
        if (selectedChapters.length === 0) {
            toast.error("Select at least one chapter.");
            return;
        }
        if (!fits) {
            const proceed = window.confirm(
                `You've requested ${totalCoverage}% of work across only ${daysAvailable} days. This may be tight. Continue anyway?`,
            );
            if (!proceed) return;
        }
        setGenerating(true);
        setPlan([]);
        setWeeklySummary("");
        setStep(3);
        try {
            const response = await fetch("/api/weekly-planner-v2", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    district,
                    classNum: Number(classNum),
                    subject,
                    daysAvailable: Number(daysAvailable),
                    minutesPerPeriod: Number(minutesPerPeriod),
                    chapters: selectedChapters,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                toast.error(err.error || `Generation failed (HTTP ${response.status})`);
                return;
            }
            const data = await response.json();
            setPlan(data.days ?? []);
            setWeeklySummary(data.weekly_summary ?? "");
            toast.success(`Weekly plan ready: ${data.days?.length ?? 0} days.`);
        } catch (err) {
            toast.error(`Network error: ${String(err)}`);
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            {/* Step indicator */}
            <div className="mb-8 flex items-center gap-2">
                {[1, 2, 3].map((n) => (
                    <React.Fragment key={n}>
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${step >= n
                                    ? "bg-brand text-white"
                                    : "bg-cream text-ink/40 ring-1 ring-brown/20"
                                }`}
                        >
                            {n}
                        </div>
                        {n < 3 && (
                            <div
                                className={`h-0.5 w-16 transition-colors ${step > n ? "bg-brand" : "bg-brown/20"
                                    }`}
                            />
                        )}
                    </React.Fragment>
                ))}
                <div className="ml-4 text-sm text-ink/70">
                    {step === 1 && "Step 1 of 3 · Setup"}
                    {step === 2 && "Step 2 of 3 · Pick chapters & coverage"}
                    {step === 3 && "Step 3 of 3 · Your weekly plan"}
                </div>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
                <div className="seekho-card p-6">
                    <h1 className="text-3xl font-bold tracking-tight text-ink">
                        Plan your week
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/80">
                        Tell us how much teaching time you have this week. We'll fit the
                        chapters you choose into the days you have.
                    </p>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <EscapeHatchSelect
                            label="District"
                            options={DISTRICTS}
                            value={district}
                            onChange={setDistrict}
                        />
                        <EscapeHatchSelect
                            label="Class"
                            options={CLASSES}
                            value={classNum}
                            onChange={setClassNum}
                        />
                        <EscapeHatchSelect
                            label="Subject"
                            options={subjects}
                            value={subject}
                            onChange={setSubject}
                        />
                        <EscapeHatchSelect
                            label="Teaching days this week"
                            options={DAYS_OPTIONS}
                            value={daysAvailable}
                            onChange={setDaysAvailable}
                        />
                        <EscapeHatchSelect
                            label="Minutes per period"
                            options={PERIOD_OPTIONS}
                            value={minutesPerPeriod}
                            onChange={setMinutesPerPeriod}
                        />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!subject}
                            className="seekho-btn-primary"
                        >
                            Next: choose chapters
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div className="seekho-card p-6">
                    <h1 className="text-2xl font-bold tracking-tight text-ink">
                        What do you want to cover?
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/80">
                        Pick the chapters you want to teach this week and set the % of each
                        chapter you want to finish. Seekho will split the work across your{" "}
                        {daysAvailable} days.
                    </p>

                    {/* Load meter */}
                    <div className="mt-6 rounded-2xl border border-brown/25 bg-olive/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-ink">
                                Workload:{" "}
                                <span className={fits ? "text-emerald-700" : "text-amber-700"}>
                                    {loadPct}%
                                </span>{" "}
                                of available time
                            </div>
                            <div className="text-xs text-ink/70">
                                {totalCoverage}% total coverage / {dayBudget}% capacity (
                                {daysAvailable} days)
                            </div>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream ring-1 ring-brown/20">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${fits
                                        ? "bg-gradient-to-r from-olive to-brand"
                                        : "bg-gradient-to-r from-amber-500 to-red-500"
                                    }`}
                                style={{ width: `${Math.min(loadPct, 100)}%` }}
                            />
                        </div>
                        {!fits && (
                            <p className="mt-2 text-xs text-amber-700">
                                ⚠ Your selection is heavy for {daysAvailable} days. Either drop a
                                chapter or lower a % target.
                            </p>
                        )}
                    </div>

                    {/* Chapter picker */}
                    <div className="mt-6 space-y-3">
                        {availableChapters.length === 0 ? (
                            <p className="text-sm text-ink/60">
                                No chapters loaded. Go back and pick a subject.
                            </p>
                        ) : (
                            availableChapters.map((ch) => {
                                const sel = selectedChapters.find((c) => c.name === ch);
                                return (
                                    <div
                                        key={ch}
                                        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${sel
                                                ? "border-brand/50 bg-brand/5"
                                                : "border-brown/20 bg-white/50 hover:bg-white"
                                            }`}
                                    >
                                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(sel)}
                                                onChange={() => toggleChapter(ch)}
                                                className="h-4 w-4 rounded border-brown/40 text-brand focus:ring-brand"
                                            />
                                            <span className="text-sm font-medium text-ink">{ch}</span>
                                        </label>
                                        {sel && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-ink/60">Coverage:</span>
                                                <select
                                                    value={sel.coveragePct}
                                                    onChange={(e) =>
                                                        setCoverage(ch, Number(e.target.value))
                                                    }
                                                    className="rounded-lg border border-brown/30 bg-white px-2 py-1 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                                >
                                                    {COVERAGE_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}%
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-6 flex flex-wrap justify-between gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="seekho-btn-secondary"
                        >
                            Back
                        </button>
                        <button
                            onClick={generatePlan}
                            disabled={selectedChapters.length === 0 || generating}
                            className="seekho-btn-primary"
                        >
                            {generating ? "Generating..." : "Generate my week"}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
                <div>
                    <div className="seekho-card p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-ink">
                                    Your week at a glance
                                </h1>
                                {weeklySummary && (
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/80">
                                        {weeklySummary}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(2)}
                                    className="seekho-btn-secondary"
                                >
                                    Edit choices
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    disabled={plan.length === 0}
                                    className="seekho-btn-secondary"
                                >
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>

                    {generating ? (
                        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
                            {Array.from({ length: Number(daysAvailable) }).map((_, i) => (
                                <div
                                    key={i}
                                    className="seekho-card h-64 animate-pulse p-4"
                                >
                                    <div className="h-3 w-12 rounded bg-brown/20" />
                                    <div className="mt-3 h-4 w-3/4 rounded bg-brown/20" />
                                    <div className="mt-6 space-y-2">
                                        <div className="h-2 rounded bg-brown/15" />
                                        <div className="h-2 w-5/6 rounded bg-brown/15" />
                                        <div className="h-2 w-2/3 rounded bg-brown/15" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : plan.length === 0 ? (
                        <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-100/60 p-6 text-sm text-amber-900">
                            No plan generated yet. Go back and try again.
                        </div>
                    ) : (
                        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
                            {plan.map((day) => (
                                <div key={day.day_number} className="seekho-card p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                                        {day.day_label}
                                    </div>
                                    <h2 className="mt-1 text-base font-semibold text-ink">
                                        {day.chapter}
                                    </h2>
                                    <p className="mt-1 text-xs text-ink/60">{day.topic_slice}</p>

                                    <details className="mt-3" open>
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink/70">
                                            Warm-up (5 min)
                                        </summary>
                                        <MarkdownRenderer className="mt-2 prose-sm">
                                            {day.warmup}
                                        </MarkdownRenderer>
                                    </details>

                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink/70">
                                            Core teach
                                        </summary>
                                        <MarkdownRenderer className="mt-2 prose-sm">
                                            {day.core_teach}
                                        </MarkdownRenderer>
                                    </details>

                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink/70">
                                            Practice
                                        </summary>
                                        <MarkdownRenderer className="mt-2 prose-sm">
                                            {day.practice}
                                        </MarkdownRenderer>
                                    </details>

                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink/70">
                                            Exit ticket (3 min)
                                        </summary>
                                        <MarkdownRenderer className="mt-2 prose-sm">
                                            {day.exit_ticket}
                                        </MarkdownRenderer>
                                    </details>

                                    {day.estimated_minutes != null && (
                                        <p className="mt-3 text-[11px] text-ink/50">
                                            ≈ {day.estimated_minutes} min total
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
