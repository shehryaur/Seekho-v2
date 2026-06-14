"use client";

/**
 * components/SyllabusRoadmap.tsx
 *
 * v3 fixes:
 *  1. Progress now persists in Supabase (table: teaching_progress) so refresh
 *     no longer wipes the teacher's history.
 *  2. "Expected by today: 1" is replaced with smart, context-aware messaging
 *     (ahead-of-pace, behind-by-N, complete).
 *  3. Optimistic UI: instant feedback locally, then sync to Postgres.
 *  4. Tiny "Synced" / "Syncing..." badge in the corner.
 */

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  CalendarDays,
  Trophy,
  RefreshCcw,
} from "lucide-react";
import { EscapeHatchSelect } from "./EscapeHatchSelect";
import {
  getVelocityStatus,
  ACADEMIC_CALENDAR,
} from "@/lib/academicCalendar";
import {
  loadAllProgress,
  markChapterTaught,
  unmarkChapter,
  type ProgressMap,
  type ProgressRow,
} from "@/lib/teachingProgress";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function SyllabusRoadmap() {
  const [classNum, setClassNum] = React.useState("6");
  const [subject, setSubject] = React.useState("");
  const [subjects, setSubjects] = React.useState<string[]>([]);
  const [chapters, setChapters] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState<ProgressMap>({});
  const [pendingChapter, setPendingChapter] = React.useState<string | null>(
    null,
  );
  const [pendingDate, setPendingDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [syncStatus, setSyncStatus] = React.useState<
    "idle" | "syncing" | "synced" | "offline"
  >("idle");

  // Load all progress from Supabase + cache on mount.
  React.useEffect(() => {
    setSyncStatus("syncing");
    loadAllProgress()
      .then((map) => {
        setProgress(map);
        setSyncStatus("synced");
      })
      .catch(() => setSyncStatus("offline"));
  }, []);

  // Subjects per class
  React.useEffect(() => {
    if (!classNum) return;
    fetch(`/api/syllabus?classNum=${classNum}`)
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []));
    setChapters([]);
  }, [classNum]);

  // Chapters per subject
  React.useEffect(() => {
    if (!classNum || !subject) return;
    fetch(
      `/api/syllabus?classNum=${classNum}&subject=${encodeURIComponent(subject)}`,
    )
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []));
  }, [classNum, subject]);

  const storageKey = `${classNum}/${subject}`;
  const doneEntries: ProgressRow[] = progress[storageKey] ?? [];
  const doneChapters = new Set(doneEntries.map((entry) => entry.chapter));
  const completedCount = doneEntries.length;
  const pct = chapters.length
    ? Math.round((completedCount / chapters.length) * 100)
    : 0;
  const velocity = getVelocityStatus(
    doneEntries,
    chapters.length || 1,
    new Date().toISOString().slice(0, 10),
  );

  // v3 messaging logic for the "expected by today" block.
  const aheadBy = Math.max(0, completedCount - velocity.expectedCount);
  const behindBy = Math.max(0, velocity.expectedCount - completedCount);
  const isComplete = chapters.length > 0 && completedCount >= chapters.length;

  async function confirmCompletedChapter() {
    if (!pendingChapter || !pendingDate) return;
    const ch = pendingChapter;
    const date = pendingDate;
    setPendingChapter(null);

    // Optimistic update
    setProgress((prev) => ({
      ...prev,
      [storageKey]: [
        ...(prev[storageKey] ?? []).filter((e) => e.chapter !== ch),
        { chapter: ch, taughtOn: date },
      ],
    }));
    setSyncStatus("syncing");
    try {
      await markChapterTaught({
        classNum: Number(classNum),
        subject,
        chapter: ch,
        taughtOn: date,
      });
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }

  async function removeChapter(chapter: string) {
    setProgress((prev) => ({
      ...prev,
      [storageKey]: (prev[storageKey] ?? []).filter(
        (e) => e.chapter !== chapter,
      ),
    }));
    setSyncStatus("syncing");
    try {
      await unmarkChapter({
        classNum: Number(classNum),
        subject,
        chapter,
      });
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="seekho-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Coverage Velocity Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/80">
              Mark chapters when they are actually taught. Seekho Engine
              compares your pace with the academic calendar and warns you
              before the board schedule starts to slip.
            </p>
          </div>
          <SyncBadge status={syncStatus} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            placeholder="Choose a subject"
            disabled={!classNum}
          />
        </div>

        {subject && chapters.length > 0 ? (
          <>
            <div className="mt-6 rounded-2xl border border-brown/25 bg-olive/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {completedCount} of {chapters.length} chapters completed
                  </div>
                  <div className="text-xs text-ink/70">
                    Academic year {ACADEMIC_CALENDAR.academicYearLabel} ·
                    Board target {ACADEMIC_CALENDAR.boardExamTarget}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-ink">{pct}%</div>
                  <div className="mt-1 text-xs">
                    {isComplete ? (
                      <span className="font-medium text-emerald-700">
                        🎉 Chapter coverage complete
                      </span>
                    ) : behindBy > 0 ? (
                      <span className="font-medium text-amber-700">
                        ⚠ {behindBy} behind pace
                      </span>
                    ) : aheadBy > 0 ? (
                      <span className="font-medium text-emerald-700">
                        ✓ {aheadBy} ahead of pace
                      </span>
                    ) : (
                      <span className="text-ink/60">On pace</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream ring-1 ring-brown/20">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isComplete
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : behindBy > 0
                        ? "bg-gradient-to-r from-amber-500 to-red-500"
                        : "bg-gradient-to-r from-olive to-brand"
                    }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isComplete ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">All chapters covered</div>
                    <p className="mt-1 leading-6">
                      Excellent work. You can now spend the remaining weeks on
                      revision, board-style mock papers, and remediation for
                      weak topics.
                    </p>
                  </div>
                </div>
              ) : velocity.isBehind ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-100/70 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Behind board pace</div>
                    <p className="mt-1 leading-6">
                      You are behind by {velocity.behindBy} chapter(s). At the
                      current pace you may miss the board exam target date.
                      Compress a lighter chapter or use the weekly planner to
                      recover time.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-olive/40 bg-olive/10 p-4 text-sm text-brand">
                  <div className="font-semibold">On track</div>
                  <p className="mt-1 leading-6">
                    Your current teaching velocity is healthy against the
                    academic calendar.
                  </p>
                </div>
              )}
            </div>

            <ul className="mt-6 overflow-hidden rounded-2xl border border-brown/25 bg-cream/80">
              {chapters.map((chapter, index) => {
                const done = doneChapters.has(chapter);
                const taughtOn = doneEntries.find(
                  (entry) => entry.chapter === chapter,
                )?.taughtOn;
                return (
                  <li
                    key={chapter}
                    className="border-b border-brown/15 last:border-b-0"
                  >
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          done
                            ? removeChapter(chapter)
                            : setPendingChapter(chapter)
                        }
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-brand" />
                        ) : (
                          <Circle className="h-5 w-5 text-brown/40" />
                        )}
                        <div>
                          <div
                            className={`text-sm font-semibold ${done ? "text-ink/50 line-through" : "text-ink"
                              }`}
                          >
                            {index + 1}. {chapter}
                          </div>
                          {taughtOn ? (
                            <div className="mt-1 text-xs text-ink/60">
                              Actually taught: {taughtOn}
                            </div>
                          ) : null}
                        </div>
                      </button>
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/?class=${classNum}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`}
                          className="text-sm font-semibold text-brand hover:text-brand-dark"
                        >
                          Generate
                        </Link>
                      </div>
                    </div>
                    {pendingChapter === chapter ? (
                      <div className="flex flex-col gap-3 border-t border-brown/15 bg-olive/5 px-4 py-4 sm:flex-row sm:items-center">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                          <CalendarDays className="h-4 w-4" /> Date actually
                          taught
                        </div>
                        <input
                          type="date"
                          value={pendingDate}
                          onChange={(e) => setPendingDate(e.target.value)}
                          className="seekho-input h-10"
                        />
                        <button
                          type="button"
                          onClick={confirmCompletedChapter}
                          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-cream hover:bg-brand-dark"
                        >
                          Save chapter
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingChapter(null)}
                          className="rounded-xl border border-brown/30 bg-cream px-4 py-2 text-sm text-ink hover:bg-olive/10"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : subject ? (
          <p className="mt-6 text-sm text-ink/60">
            No chapters found for this subject yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SyncBadge({
  status,
}: {
  status: "idle" | "syncing" | "synced" | "offline";
}) {
  if (status === "idle") return null;
  const map = {
    syncing: {
      label: "Syncing...",
      cls: "bg-amber-100 text-amber-800 border-amber-300",
      icon: <RefreshCcw className="h-3 w-3 animate-spin" />,
    },
    synced: {
      label: "Synced",
      cls: "bg-emerald-100 text-emerald-800 border-emerald-300",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    offline: {
      label: "Offline · local only",
      cls: "bg-red-100 text-red-800 border-red-300",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  } as const;
  const item = map[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.cls}`}
    >
      {item.icon}
      {item.label}
    </div>
  );
}
