"use client";

/**
 * components/WeeklyBatchPlanner.tsx
 *
 * NEW Plan My Week experience.
 *
 * Flow:
 *   1. Class + Subject + District + Total teaching days + Minutes per period
 *   2. For each chapter the teacher cares about this week:
 *        - check the chapter
 *        - pick "Full chapter" (other topic checkboxes auto-grey out)
 *          OR tick specific topics
 *   3. Click Generate -> single API call returns a day-by-day plan
 *      (Day 1: prereqs, Day 2: core idea, Day 3: activity, Day 4: ...)
 *
 * The chapter-and-topic checkbox UI is deliberately the only place the
 * teacher tells Seekho what to cover, so the model only spends tokens on
 * what's actually needed. Compared to the old 5-parallel-lesson-pack
 * approach this uses roughly 1/5 the tokens and never gets cut off
 * mid-generation.
 *
 * No existing variable names (buildPrompt / parseLessonJson / supabase
 * helpers / parent_engagement_card / etc) are touched here.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { EscapeHatchSelect } from "./EscapeHatchSelect";
import { MarkdownRenderer } from "./MarkdownRenderer";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const DISTRICTS = [
  "Fateh Jang / Attock",
  "Lahore",
  "Karachi",
  "Multan",
  "Peshawar",
  "Rawalpindi / Islamabad",
  "Faisalabad",
  "Gujranwala",
  "Quetta",
  "Sialkot",
];

// Smart day presets. Single-number input is the most consistent pattern
// across teacher-planner apps (Planboard / MagicSchool / PlanWiz). Teachers
// think in "how many periods do I need to finish this", not "days per week
// × weeks". We give chips up to 15 so two-week plans still fit.
const DAY_PRESETS = [3, 5, 8, 10, 15];
const PERIOD_PRESETS = [35, 40, 45, 60];

interface ChapterTopicsCache {
  [chapter: string]: string[];
}

interface ChapterSelection {
  name: string;
  fullChapter: boolean;
  topics: string[]; // ticked topics inside the chapter
}

interface DayPlan {
  day_number: number;
  day_label: string;
  chapter: string;
  topic_slice: string;
  objective: string;
  warmup: string;
  core_teach: string;
  activity: string;
  practice: string;
  exit_ticket: string;
  homework?: string;
  estimated_minutes?: number;
}

export default function WeeklyBatchPlanner() {
  // step 1 — setup
  const [school, setSchool] = React.useState("");
  const [district, setDistrict] = React.useState("Fateh Jang / Attock");
  const [classNum, setClassNum] = React.useState("6");
  const [subject, setSubject] = React.useState("");
  const [totalDays, setTotalDays] = React.useState(5);
  const [minutesPerPeriod, setMinutesPerPeriod] = React.useState(40);
  const [extra, setExtra] = React.useState("");

  // step 2 — chapter and topic checkboxes
  const [subjects, setSubjects] = React.useState<string[]>([]);
  const [chapters, setChapters] = React.useState<string[]>([]);
  const [selections, setSelections] = React.useState<
    Record<string, ChapterSelection>
  >({});
  const [topicsByChapter, setTopicsByChapter] =
    React.useState<ChapterTopicsCache>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // step 3 — output
  const [loading, setLoading] = React.useState(false);
  const [plan, setPlan] = React.useState<DayPlan[]>([]);
  const [weeklySummary, setWeeklySummary] = React.useState("");
  const [coverageNotes, setCoverageNotes] = React.useState("");

  // load subjects when class changes
  React.useEffect(() => {
    fetch(`/api/syllabus?classNum=${classNum}`)
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => setSubjects([]));
    setChapters([]);
    setSelections({});
    setExpanded({});
  }, [classNum]);

  // load chapters when subject changes
  React.useEffect(() => {
    if (!subject) return;
    fetch(
      `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(subject)}`,
    )
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []))
      .catch(() => setChapters([]));
    setSelections({});
    setExpanded({});
  }, [classNum, subject]);

  async function loadTopics(chapter: string) {
    if (topicsByChapter[chapter]) return topicsByChapter[chapter];
    try {
      const r = await fetch(
        `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(
          subject,
        )}&chapter=${encodeURIComponent(chapter)}`,
      );
      const d = await r.json();
      const topics: string[] = d.topics ?? [];
      setTopicsByChapter((prev) => ({ ...prev, [chapter]: topics }));
      return topics;
    } catch {
      setTopicsByChapter((prev) => ({ ...prev, [chapter]: [] }));
      return [];
    }
  }

  function toggleChapter(name: string) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[name]) {
        delete next[name];
      } else {
        next[name] = { name, fullChapter: true, topics: [] };
        // auto-expand so teacher immediately sees topic checkboxes
        setExpanded((e) => ({ ...e, [name]: true }));
        loadTopics(name);
      }
      return next;
    });
  }

  function setFullChapter(name: string, value: boolean) {
    setSelections((prev) => {
      const current = prev[name];
      if (!current) return prev;
      return {
        ...prev,
        [name]: {
          ...current,
          fullChapter: value,
          topics: value ? [] : current.topics,
        },
      };
    });
    if (!value) loadTopics(name);
  }

  function toggleTopic(chapter: string, topic: string) {
    setSelections((prev) => {
      const current = prev[chapter];
      if (!current) return prev;
      const exists = current.topics.includes(topic);
      const topics = exists
        ? current.topics.filter((t) => t !== topic)
        : [...current.topics, topic];
      return {
        ...prev,
        [chapter]: { ...current, topics, fullChapter: false },
      };
    });
  }

  function toggleExpanded(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
    if (!expanded[name]) loadTopics(name);
  }

  const selectedChapters = Object.values(selections);
  const canGenerate =
    Boolean(subject) &&
    selectedChapters.length > 0 &&
    selectedChapters.every(
      (s) => s.fullChapter || s.topics.length > 0,
    ) &&
    !loading;

  async function generatePlan() {
    if (!canGenerate) return;
    setLoading(true);
    setPlan([]);
    setWeeklySummary("");
    setCoverageNotes("");
    try {
      const r = await fetch("/api/weekly-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: school || "School",
          district,
          classNum: Number(classNum),
          subject,
          totalDays,
          minutesPerPeriod,
          chapters: selectedChapters.map((s) => ({
            name: s.name,
            fullChapter: s.fullChapter,
            topics: s.fullChapter ? [] : s.topics,
          })),
          extra,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || `Generation failed (HTTP ${r.status})`);
        return;
      }
      const data = await r.json();
      setPlan(data.days ?? []);
      setWeeklySummary(data.weekly_summary ?? "");
      setCoverageNotes(data.coverage_notes ?? "");
      toast.success(`Weekly plan ready: ${data.days?.length ?? 0} days.`);
    } catch (err) {
      toast.error(`Network error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="seekho-section-label">Plan My Week</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Tell Seekho what you want to cover. It splits it across your days.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/72">
            Pick chapters, then either the <strong>Full chapter</strong> or just
            the <strong>specific topics</strong> you want to deliver. We will
            break it across exactly the number of days you have so the chapter
            actually finishes on time.
          </p>
        </div>
      </div>

      {/* Step 1: setup */}
      <section className="seekho-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-lime-500 text-sm font-bold text-white shadow-lg shadow-emerald-200/60">
            1
          </span>
          <h2 className="text-xl font-semibold text-ink">Class context</h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-ink">
              School
            </label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="seekho-input"
              placeholder="Govt. High School Fateh Jang"
            />
          </div>
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
            className="sm:col-span-2"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Total teaching days
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={totalDays}
              onChange={(e) =>
                setTotalDays(
                  Math.max(1, Math.min(15, Number(e.target.value) || 1)),
                )
              }
              className="seekho-input"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAY_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTotalDays(d)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${totalDays === d
                      ? "bg-emerald-700 text-white"
                      : "bg-white/80 text-ink/70 ring-1 ring-emerald-700/20 hover:bg-emerald-50"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/55">
              1–15 periods. Use 5 for one week, 10 for two weeks.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Minutes per period
            </label>
            <input
              type="number"
              min={20}
              max={120}
              value={minutesPerPeriod}
              onChange={(e) =>
                setMinutesPerPeriod(
                  Math.max(20, Math.min(120, Number(e.target.value) || 40)),
                )
              }
              className="seekho-input"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PERIOD_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMinutesPerPeriod(d)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${minutesPerPeriod === d
                      ? "bg-emerald-700 text-white"
                      : "bg-white/80 text-ink/70 ring-1 ring-emerald-700/20 hover:bg-emerald-50"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: chapters + topics */}
      <section className="seekho-card mt-6 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-lime-500 text-sm font-bold text-white shadow-lg shadow-emerald-200/60">
            2
          </span>
          <h2 className="text-xl font-semibold text-ink">
            Choose chapters and what to cover
          </h2>
        </div>
        <p className="mt-2 text-sm text-ink/70">
          Tick the chapters you want this week. Either keep{" "}
          <strong>Full chapter</strong> on, or turn it off to tick only the
          topics you want.
        </p>

        <div className="mt-5 space-y-3">
          {chapters.length === 0 ? (
            <div className="rounded-2xl border border-emerald-700/15 bg-white/60 px-4 py-5 text-sm text-ink/60">
              Pick a subject above to load the chapter list.
            </div>
          ) : (
            chapters.map((ch) => {
              const sel = selections[ch];
              const isOpen = expanded[ch];
              const topics = topicsByChapter[ch];
              return (
                <div
                  key={ch}
                  className={`rounded-2xl border transition ${sel
                      ? "border-emerald-700/40 bg-emerald-50/70 shadow-[0_18px_40px_-28px_rgba(20,83,45,0.45)]"
                      : "border-emerald-700/12 bg-white/65 hover:bg-white"
                    }`}
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(sel)}
                        onChange={() => toggleChapter(ch)}
                        className="h-4 w-4 rounded border-emerald-700/40 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-sm font-semibold text-ink">
                        {ch}
                      </span>
                    </label>

                    {sel && (
                      <label className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink/80 ring-1 ring-emerald-700/20">
                        <input
                          type="checkbox"
                          checked={sel.fullChapter}
                          onChange={(e) =>
                            setFullChapter(ch, e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        Full chapter
                      </label>
                    )}

                    {sel && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(ch)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink/65 hover:text-ink"
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide topics
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Pick topics
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {sel && isOpen && (
                    <div className="border-t border-emerald-700/12 px-4 py-3">
                      {topics === undefined ? (
                        <div className="text-xs text-ink/55">
                          Loading topics…
                        </div>
                      ) : topics.length === 0 ? (
                        <div className="text-xs text-ink/55">
                          No topic list available for this chapter. Use{" "}
                          <strong>Full chapter</strong>.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {topics.map((t) => {
                            const checked = sel.topics.includes(t);
                            const disabled = sel.fullChapter;
                            return (
                              <label
                                key={t}
                                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${disabled
                                    ? "border-emerald-700/10 bg-white/40 text-ink/40"
                                    : checked
                                      ? "border-emerald-700/45 bg-emerald-50/80 text-ink"
                                      : "border-emerald-700/15 bg-white/70 text-ink/80 hover:bg-emerald-50/60"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked && !disabled}
                                  disabled={disabled}
                                  onChange={() => toggleTopic(ch, t)}
                                  className="mt-0.5 h-4 w-4 rounded border-emerald-700/40 text-emerald-700 focus:ring-emerald-600 disabled:cursor-not-allowed"
                                />
                                <span>{t}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {sel.fullChapter && topics && topics.length > 0 && (
                        <p className="mt-2 text-[11px] italic text-ink/55">
                          Topic checkboxes are disabled because{" "}
                          <strong>Full chapter</strong> is on.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-ink">
            Anything special this week? (optional)
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            placeholder="e.g. Test on Friday, exam revision focus, multi-grade class…"
            className="seekho-input h-auto py-2"
          />
        </div>

        {selectedChapters.length > 0 && (
          <div className="mt-4 rounded-2xl border border-emerald-700/15 bg-white/70 p-4 text-sm text-ink/78">
            <div className="font-semibold text-emerald-900">
              You picked {selectedChapters.length} chapter
              {selectedChapters.length === 1 ? "" : "s"} for {totalDays} day
              {totalDays === 1 ? "" : "s"}:
            </div>
            <ul className="mt-2 space-y-1">
              {selectedChapters.map((s) => (
                <li key={s.name} className="text-sm">
                  • <strong>{s.name}</strong> —{" "}
                  {s.fullChapter
                    ? "Full chapter"
                    : s.topics.length > 0
                      ? `${s.topics.length} topic${s.topics.length === 1 ? "" : "s"}: ${s.topics.join(", ")}`
                      : "no topics ticked yet"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Generate */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={generatePlan}
          disabled={!canGenerate}
          className="seekho-btn-primary seekho-btn-xl"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your day-by-day plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate day-by-day plan
            </>
          )}
        </button>
      </div>

      {/* Step 3: output */}
      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: Math.min(totalDays, 6) }).map((_, i) => (
            <div key={i} className="seekho-day-card h-56 p-5">
              <div className="h-3 w-16 rounded animate-shimmer" />
              <div className="mt-3 h-4 w-3/4 rounded animate-shimmer" />
              <div className="mt-6 space-y-2">
                <div className="h-2 rounded animate-shimmer" />
                <div className="h-2 w-5/6 rounded animate-shimmer" />
                <div className="h-2 w-2/3 rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && plan.length > 0 && (
        <section className="mt-8">
          <div className="seekho-card mb-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CalendarRange className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="text-xl font-semibold text-ink">
                    Your week at a glance
                  </h3>
                  {weeklySummary && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/78">
                      {weeklySummary}
                    </p>
                  )}
                  {coverageNotes && (
                    <p className="mt-2 max-w-3xl rounded-xl bg-amber-50/70 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-300/40">
                      <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                      {coverageNotes}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="seekho-btn-secondary no-print"
              >
                <Printer className="h-4 w-4" />
                Print all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {plan.map((day, index) => (
              <article
                key={day.day_number}
                className="seekho-day-card seekho-fade-up p-5 sm:p-6"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      {day.day_label}
                    </div>
                    <h4 className="mt-1 text-lg font-semibold text-ink">
                      {day.chapter}
                    </h4>
                    <div className="text-sm text-ink/70">{day.topic_slice}</div>
                  </div>
                  {day.estimated_minutes != null && (
                    <span className="rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-semibold text-emerald-900">
                      ~{day.estimated_minutes} min
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-700/15">
                  <strong>Objective:</strong> {day.objective}
                </div>

                <DayBlock label="Warm-up (5 min)" md={day.warmup} openByDefault />
                <DayBlock label="Core teach" md={day.core_teach} />
                <DayBlock label="Class activity" md={day.activity} />
                <DayBlock label="Practice" md={day.practice} />
                <DayBlock label="Exit ticket (3 min)" md={day.exit_ticket} />
                {day.homework && (
                  <DayBlock label="Homework" md={day.homework} />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DayBlock({
  label,
  md,
  openByDefault = false,
}: {
  label: string;
  md: string;
  openByDefault?: boolean;
}) {
  return (
    <details className="mt-3 rounded-xl border border-emerald-700/12 bg-white/65 px-3 py-2" open={openByDefault}>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-ink/65">
        {label}
      </summary>
      <div className="mt-2">
        <MarkdownRenderer className="prose-sm">{md}</MarkdownRenderer>
      </div>
    </details>
  );
}
