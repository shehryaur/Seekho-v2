"use client";

/**
 * components/LessonGenerator.tsx
 *
 * Heart of the daily planning loop.
 *
 * Phase 1: surfaces fallback banner when parseLessonJson hits its lenient path.
 * Phase 2: Removed substitute-guide tab, public sharing toggle, exam links.
 * Phase 3:
 *   • Load Shedding Sync Queue — failed generate POSTs are stashed in
 *     localStorage with a yellow banner. A small "Retry queued" button drains
 *     the queue when connectivity returns.
 *   • Local Analogy Flywheel — thumbs-up button on every tab. Clicking saves
 *     the rendered snippet to /api/analogy. UI shows a toast & disables the
 *     button to avoid double-voting.
 *   • Multi-Grade sliders + Root Cause classifier remain fully wired.
 * Phase 4: New palette — cream / brand / olive / brown / ink.
 */

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  MessageCircle,
  Printer,
  Sparkles,
  Stethoscope,
  ThumbsUp,
  Users,
  WifiOff,
} from "lucide-react";
import { EscapeHatchSelect } from "./EscapeHatchSelect";
import { InventorySelector } from "./InventorySelector";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { toWhatsAppUrl } from "@/lib/utils";
import { ParentWhatsAppCard } from "./ParentWhatsAppCard";
import type { LessonJson, MultiGradeMix } from "@/lib/supabase";

type Language = "English" | "Roman Urdu" | "Pure Urdu (Script)";
type Profile =
  | "Standard"
  | "Weak Class (Below Average)"
  | "Strong Class (Above Average)";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const FALLBACK_SUBJECTS = [
  "English",
  "Urdu",
  "Mathematics",
  "Science",
  "General Knowledge",
  "Social Studies",
  "Islamiyat",
  "Computer Science",
  "Physics",
  "Chemistry",
  "Biology",
];
const DEFAULT_DISTRICTS = [
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
const TABS = [
  "teacher",
  "student",
  "activity",
  "quiz",
  "homework",
  "parent",
] as const;

type TabKey = (typeof TABS)[number];

const QUEUE_KEY = "seekho:queue:v1";

interface GenResponse {
  lesson: LessonJson;
  shareToken: string | null;
  fallback: boolean;
  verifiedContextCount?: number;
}

interface QueuedPayload {
  queuedAt: string;
  payload: Record<string, unknown>;
}

function loadQueue(): QueuedPayload[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedPayload[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function rebalanceMix(
  current: MultiGradeMix,
  key: "belowGrade" | "atGrade" | "aboveGrade",
  value: number,
): MultiGradeMix {
  const nextValue = Math.max(0, Math.min(100, value));
  const others = (
    ["belowGrade", "atGrade", "aboveGrade"] as const
  ).filter((item) => item !== key);
  const currentOtherSum = current[others[0]] + current[others[1]];
  const remaining = 100 - nextValue;
  const first =
    currentOtherSum === 0
      ? Math.round(remaining / 2)
      : Math.round((current[others[0]] / currentOtherSum) * remaining);
  const second = remaining - first;
  return {
    ...current,
    [key]: nextValue,
    [others[0]]: first,
    [others[1]]: second,
  };
}

export default function LessonGenerator({
  initialValues,
}: {
  initialValues?: { classNum?: string; subject?: string; chapter?: string };
}) {
  // ───────────────────────── form state ─────────────────────────
  const [school, setSchool] = React.useState("");
  const [district, setDistrict] = React.useState("Fateh Jang / Attock");
  const [classNum, setClassNum] = React.useState(initialValues?.classNum ?? "");
  const [subject, setSubject] = React.useState(initialValues?.subject ?? "");
  const [chapter, setChapter] = React.useState(initialValues?.chapter ?? "");
  const [topic, setTopic] = React.useState("");
  const [language, setLanguage] = React.useState<Language>("English");
  const [profile, setProfile] = React.useState<Profile>("Standard");
  const [urduTranslate, setUrduTranslate] = React.useState(false);
  const [inventory, setInventory] = React.useState<string[]>([]);
  const [extra, setExtra] = React.useState("");
  const [subjects, setSubjects] = React.useState<string[]>(FALLBACK_SUBJECTS);
  const [chapters, setChapters] = React.useState<string[]>([]);
  const [topics, setTopics] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<GenResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabKey>("teacher");
  const [multiGradeEnabled, setMultiGradeEnabled] = React.useState(false);
  const [multiGrade, setMultiGrade] = React.useState<MultiGradeMix>({
    enabled: false,
    belowGrade: 20,
    atGrade: 60,
    aboveGrade: 20,
  });

  // Root-cause classifier state
  const [diagnostics, setDiagnostics] = React.useState("");
  const [averageScore, setAverageScore] = React.useState(45);
  const [lessonWentWell, setLessonWentWell] = React.useState("Partially");
  const [remediation, setRemediation] = React.useState("");
  const [classification, setClassification] = React.useState("");
  const [remLoading, setRemLoading] = React.useState(false);

  // Load-shedding queue
  const [queueLen, setQueueLen] = React.useState(0);
  const [queueBanner, setQueueBanner] = React.useState(false);

  // Per-section thumbs-up state ("voted" memo so we disable after click).
  const [voted, setVoted] = React.useState<Record<TabKey, boolean>>({
    teacher: false,
    student: false,
    activity: false,
    quiz: false,
    homework: false,
    parent: false,
  });

  // ─── effects ───
  React.useEffect(() => {
    if (initialValues?.classNum) setClassNum(initialValues.classNum);
    if (initialValues?.subject) setSubject(initialValues.subject);
    if (initialValues?.chapter) setChapter(initialValues.chapter);
  }, [initialValues?.classNum, initialValues?.subject, initialValues?.chapter]);

  React.useEffect(() => {
    setQueueLen(loadQueue().length);
  }, []);

  React.useEffect(() => {
    if (!classNum) return;
    fetch(`/api/syllabus?classNum=${classNum}`)
      .then((r) => r.json())
      .then((data) =>
        setSubjects(data.subjects?.length ? data.subjects : FALLBACK_SUBJECTS),
      )
      .catch(() => setSubjects(FALLBACK_SUBJECTS));
    setChapters([]);
    setTopics([]);
  }, [classNum]);

  React.useEffect(() => {
    if (!classNum || !subject) return;
    fetch(
      `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(subject)}`,
    )
      .then((r) => r.json())
      .then((data) => setChapters(data.chapters ?? []))
      .catch(() => setChapters([]));
    setTopics([]);
  }, [classNum, subject]);

  React.useEffect(() => {
    if (!classNum || !subject || !chapter) return;
    fetch(
      `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`,
    )
      .then((r) => r.json())
      .then((data) => setTopics(data.topics ?? []))
      .catch(() => setTopics([]));
  }, [classNum, subject, chapter]);

  const canSubmit = Boolean(
    school?.trim() &&
      district?.trim() &&
      classNum &&
      subject?.trim() &&
      chapter?.trim() &&
      !loading &&
      (!multiGradeEnabled ||
        multiGrade.belowGrade + multiGrade.atGrade + multiGrade.aboveGrade ===
          100),
  );

  function buildPayload() {
    return {
      school,
      district,
      classNum: Number(classNum),
      subject,
      chapter,
      topic: topic || "Full Chapter Overview",
      language,
      profile,
      extra,
      topicsList: topics,
      urduTranslate,
      inventory,
      multiGrade: { ...multiGrade, enabled: multiGradeEnabled },
    };
  }

  async function postGenerate(payload: Record<string, unknown>) {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data as GenResponse;
  }

  async function handleGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    setRemediation("");
    setClassification("");
    setVoted({
      teacher: false,
      student: false,
      activity: false,
      quiz: false,
      homework: false,
      parent: false,
    });

    const payload = buildPayload();

    try {
      const data = await postGenerate(payload);
      setResult(data);
      setActiveTab("teacher");
      toast.success(
        data.fallback
          ? "Lesson returned in fallback mode (partial JSON)."
          : "Lesson pack ready",
      );
    } catch (error) {
      const isNetwork =
        error instanceof TypeError ||
        /failed to fetch|networkerror|load failed/i.test(String(error));
      if (isNetwork) {
        // ── Load Shedding Sync Queue ──
        const queue = loadQueue();
        queue.push({ queuedAt: new Date().toISOString(), payload });
        saveQueue(queue);
        setQueueLen(queue.length);
        setQueueBanner(true);
        toast.warning("Connection lost — lesson queued locally", {
          description: "We'll keep your inputs safe. Hit Retry when online.",
        });
      } else {
        toast.error("Generation failed", { description: String(error) });
      }
    } finally {
      setLoading(false);
    }
  }

  async function drainQueue() {
    const queue = loadQueue();
    if (queue.length === 0) {
      setQueueBanner(false);
      return;
    }
    setLoading(true);
    let lastResult: GenResponse | null = null;
    const remaining: QueuedPayload[] = [];
    for (const item of queue) {
      try {
        lastResult = await postGenerate(
          item.payload as Record<string, unknown>,
        );
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
    setQueueLen(remaining.length);
    setLoading(false);
    if (lastResult) {
      setResult(lastResult);
      setActiveTab("teacher");
      toast.success(
        `Synced ${queue.length - remaining.length} queued lesson(s).`,
      );
    }
    if (remaining.length === 0) setQueueBanner(false);
  }

  async function handleRemediation() {
    if (!result?.lesson || !diagnostics.trim()) return;
    setRemLoading(true);
    try {
      const response = await fetch("/api/remediation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken: result.shareToken ?? undefined,
          lessonJson: result.lesson,
          district,
          classNum: Number(classNum),
          subject,
          chapter,
          language,
          diagnostics,
          averageScore,
          lessonWentWell,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        toast.error("Remediation failed", {
          description: data.error || `HTTP ${response.status}`,
        });
        return;
      }
      setClassification(data.classification);
      setRemediation(data.remediation);
    } catch (error) {
      toast.error("Remediation failed", { description: String(error) });
    } finally {
      setRemLoading(false);
    }
  }

  function copySection(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
  }

  function shareSection(text: string) {
    window.open(toWhatsAppUrl(text), "_blank", "noopener,noreferrer");
  }

  async function thumbsUpSection(tab: TabKey, text: string) {
    if (!text.trim() || voted[tab]) return;
    // Trim to ~1200 chars so we don't bloat the table with tab-sized blobs.
    const snippet = text.trim().slice(0, 1200);
    try {
      const response = await fetch("/api/analogy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district,
          classNum: classNum ? Number(classNum) : null,
          subject: subject || null,
          section: tab,
          snippet,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        toast.error("Could not save thumbs-up", {
          description: data.error || `HTTP ${response.status}`,
        });
        return;
      }
      setVoted((prev) => ({ ...prev, [tab]: true }));
      toast.success(
        `Saved to verified context for ${district}. Total votes: ${data.votes}`,
      );
    } catch (error) {
      toast.error("Network error saving vote", {
        description: String(error),
      });
    }
  }

  const renderedTabContent: Record<TabKey, string> = {
    teacher: result?.lesson.teacher_guide ?? "",
    student: result?.lesson.student_handbook ?? "",
    activity: result?.lesson.class_activity ?? "",
    quiz: [
      result?.lesson.quiz.questions,
      "\n\n## Teacher answer key\n",
      result?.lesson.quiz.answer_key,
    ]
      .filter(Boolean)
      .join(""),
    homework: result?.lesson.homework
      ? `## ${result.lesson.homework.title}\n\n${result.lesson.homework.instructions.map((item) => `- ${item}`).join("\n")}\n\nEstimated time: ${result.lesson.homework.estimated_time_minutes} minutes\n\nBring to class: ${result.lesson.homework.bring_to_class}`
      : "",
    parent: result?.lesson.parent_engagement_card ?? "",
  };

  // ───────────────────────── render ─────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {queueBanner || queueLen > 0 ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-yellow-500/40 bg-yellow-100/80 px-4 py-3 text-sm text-yellow-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>
              <strong>Connection lost.</strong> {queueLen} lesson
              {queueLen === 1 ? "" : "s"} queued locally.
            </span>
          </div>
          <button
            type="button"
            onClick={drainQueue}
            disabled={loading || queueLen === 0}
            className="rounded-xl bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Retry queued
          </button>
        </div>
      ) : null}

      <div className="seekho-card p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-ink">
              School name
            </label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Govt. Girls Elementary School Fateh Jang"
              className="seekho-input"
            />
          </div>
          <EscapeHatchSelect
            label="District"
            options={DEFAULT_DISTRICTS}
            value={district}
            onChange={setDistrict}
            hint="Used for local names, food, landmarks and occupations."
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
            disabled={!classNum}
          />
          <EscapeHatchSelect
            label="Chapter"
            options={chapters}
            value={chapter}
            onChange={setChapter}
            disabled={!subject}
            className="sm:col-span-2"
          />
          <EscapeHatchSelect
            label="Topic focus (optional)"
            options={
              topics.length ? ["Full Chapter Overview", ...topics] : []
            }
            value={topic}
            onChange={setTopic}
            className="sm:col-span-2"
            hint="Leave blank to cover the whole chapter."
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-brown/25 bg-olive/5 p-4">
            <div className="text-sm font-semibold text-ink">Language</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["English", "Roman Urdu", "Pure Urdu (Script)"] as const).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    className={`seekho-pill ${language === item ? "seekho-pill-active" : "seekho-pill-idle"}`}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="mt-4 text-sm font-semibold text-ink">
              Class profile
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  "Standard",
                  "Weak Class (Below Average)",
                  "Strong Class (Above Average)",
                ] as const
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProfile(item)}
                  className={`seekho-pill ${profile === item ? "seekho-pill-active" : "seekho-pill-idle"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={urduTranslate}
                onChange={(e) => setUrduTranslate(e.target.checked)}
                className="h-4 w-4 rounded border-brown/40 text-brand accent-olive"
              />
              Also translate student-facing sections into Urdu where helpful
            </label>
          </div>

          <div className="rounded-2xl border border-brown/25 bg-olive/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">
                  Multi-grade classroom mode
                </div>
                <p className="mt-1 text-xs text-ink/70">
                  Build Foundation, Core and Extension tracks inside the same
                  lesson.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMultiGradeEnabled((current) => !current);
                  setMultiGrade((current) => ({
                    ...current,
                    enabled: !multiGradeEnabled,
                  }));
                }}
                className={`seekho-pill ${multiGradeEnabled ? "seekho-pill-active" : "seekho-pill-idle"}`}
              >
                {multiGradeEnabled ? "Enabled" : "Off"}
              </button>
            </div>
            <div
              className={`mt-4 space-y-4 ${multiGradeEnabled ? "opacity-100" : "opacity-50"}`}
            >
              {(
                [
                  ["belowGrade", "Below grade"],
                  ["atGrade", "At grade"],
                  ["aboveGrade", "Above grade"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink/80">
                    <span>{label}</span>
                    <span>{multiGrade[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={multiGrade[key]}
                    disabled={!multiGradeEnabled}
                    onChange={(e) =>
                      setMultiGrade((current) =>
                        rebalanceMix(current, key, Number(e.target.value)),
                      )
                    }
                    className="w-full accent-brand"
                  />
                </div>
              ))}
              <div className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink ring-1 ring-brown/25">
                <Users className="h-3.5 w-3.5" /> Total:{" "}
                {multiGrade.belowGrade +
                  multiGrade.atGrade +
                  multiGrade.aboveGrade}
                %
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <InventorySelector
            value={inventory}
            onChange={setInventory}
            disabled={loading}
          />
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-ink">
            Extra instructions
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={3}
            placeholder="Example: connect today's lesson with a recent local event or market example."
            className="w-full rounded-2xl border border-brown/30 bg-cream/80 px-3 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-olive/30"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-ink/70">
            If you came from the roadmap, the chapter fields are already
            hydrated and ready.
          </div>
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="seekho-btn-primary"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading
              ? "Generating lesson pack..."
              : "Generate lesson pack"}
          </button>
        </div>
      </div>

      {result ? (
        <div className="mt-8 space-y-6">
          {result.fallback ? (
            <div className="rounded-2xl border border-yellow-500/40 bg-yellow-100/70 p-4 text-sm text-yellow-900">
              ⚠️ The model returned a partial response. The tabs below were
              salvaged via the lenient parser. Regenerate for a cleaner pack.
            </div>
          ) : null}

          <div className="seekho-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">
                  {chapter}
                </h2>
                <p className="mt-1 text-sm text-ink/70">
                  Class {classNum} · {subject} · {district}
                  {result.verifiedContextCount && result.verifiedContextCount > 0
                    ? ` · ${result.verifiedContextCount} verified local examples used`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.shareToken ? (
                  <Link
                    href={`/print/${result.shareToken}`}
                    target="_blank"
                    className="seekho-btn-secondary"
                  >
                    <Printer className="h-4 w-4" /> Print-shop view
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`seekho-pill capitalize ${activeTab === tab ? "seekho-pill-active" : "seekho-pill-idle"}`}
                >
                  {tab === "parent" ? "Parent card" : tab}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-brown/25 bg-cream/60 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() =>
                    thumbsUpSection(activeTab, renderedTabContent[activeTab])
                  }
                  disabled={voted[activeTab] || !renderedTabContent[activeTab]}
                  title="Save this local example to the verified context flywheel"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${voted[activeTab] ? "bg-olive/20 text-brand" : "border border-brown/30 bg-cream text-ink hover:bg-olive/15"}`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {voted[activeTab] ? "Saved" : "This worked"}
                </button>
                <button
                  onClick={() => copySection(renderedTabContent[activeTab])}
                  className="inline-flex items-center gap-2 rounded-lg border border-brown/30 bg-cream px-3 py-2 text-sm font-semibold text-ink hover:bg-olive/15"
                >
                  <Copy className="h-4 w-4" /> Copy section
                </button>
                <button
                  onClick={() => shareSection(renderedTabContent[activeTab])}
                  className="inline-flex items-center gap-2 rounded-lg bg-olive px-3 py-2 text-sm font-semibold text-cream hover:bg-olive-dark"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              </div>
              <MarkdownRenderer>
                {renderedTabContent[activeTab]}
              </MarkdownRenderer>

              {activeTab === "parent" && result?.lesson ? (
                <ParentWhatsAppCard
                  classNum={classNum}
                  subject={subject}
                  chapter={chapter}
                  topic={topic}
                  lesson={result.lesson}
                />
              ) : null}
            </div>
          </div>


          <div className="seekho-card p-6">
            <div className="flex items-center gap-2 text-ink">
              <Stethoscope className="h-5 w-5 text-brand" />
              <h3 className="text-xl font-bold tracking-tight">
                Assessment root cause classifier
              </h3>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/80">
              Tell Seekho Engine how the quiz went. It classifies the issue as
              a <strong>Delivery Gap</strong>, <strong>Curriculum Gap</strong>{" "}
              or <strong>Assessment Mismatch</strong> before writing tomorrow's
              remediation plan.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-ink">
                  Teacher observation
                </label>
                <textarea
                  value={diagnostics}
                  onChange={(e) => setDiagnostics(e.target.value)}
                  rows={3}
                  placeholder="Example: 15 out of 40 students failed question 3 and mixed up photosynthesis with respiration."
                  className="w-full rounded-2xl border border-brown/30 bg-cream/80 px-3 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-olive/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  Average score (%)
                </label>
                <input
                  type="number"
                  value={averageScore}
                  min={0}
                  max={100}
                  onChange={(e) => setAverageScore(Number(e.target.value))}
                  className="seekho-input"
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-1 block text-sm font-medium text-ink">
                  Lesson went well?
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["Yes", "Partially", "No"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLessonWentWell(item)}
                      className={`seekho-pill ${lessonWentWell === item ? "seekho-pill-active" : "seekho-pill-idle"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRemediation}
                disabled={!diagnostics.trim() || remLoading}
                className="seekho-btn-primary"
              >
                {remLoading
                  ? "Classifying..."
                  : "Classify & generate remediation"}
              </button>
              {classification ? (
                <span className="rounded-full bg-olive/20 px-3 py-1 text-xs font-semibold text-brand">
                  Root cause: {classification}
                </span>
              ) : null}
            </div>
            {remediation ? (
              <div className="mt-5 rounded-2xl border border-brown/25 bg-cream/70 p-5">
                <MarkdownRenderer>{remediation}</MarkdownRenderer>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
