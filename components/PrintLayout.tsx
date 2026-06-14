"use client";

/**
 * components/PrintLayout.tsx
 *
 * Print-shop view that turns a generated lesson into A4-ready paper output.
 *
 * Phase 2: Substitute QR + UUID block removed.
 * Phase 3: Homework compression slips are now rendered as exactly 4 identical
 *          compact cards on a single A4 page (2x2 grid), break-inside avoided.
 * Phase 4: Cream/olive/brand palette applied.
 */

import { Printer } from "lucide-react";
import type { LessonJson } from "@/lib/supabase";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface PrintLayoutProps {
  lesson: LessonJson;
  meta: {
    school: string;
    classNum: number | string;
    subject: string;
    chapter: string;
    district: string;
  };
}

export function PrintLayout({ lesson, meta }: PrintLayoutProps) {
  const homework = lesson.homework;

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }
        @media print {
          body {
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            box-shadow: none !important;
            border: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .sheet-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10mm;
          }
          .homework-slip-page {
            page-break-before: always;
          }
          .homework-slip-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 6mm;
            min-height: 250mm;
          }
          .homework-slip {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print mx-auto max-w-4xl px-4 pt-6">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-brown/30 bg-cream px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-olive/15"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* ───── Page 1: Student handbook + Quiz side-by-side ───── */}
      <article className="print-page mx-auto my-6 max-w-[210mm] rounded-2xl bg-white p-8 text-ink shadow-soft ring-1 ring-brown/20">
        <header className="border-b border-brown/25 pb-4">
          <h1 className="text-2xl font-bold">{meta.school}</h1>
          <p className="mt-1 text-sm text-ink/70">
            Class {meta.classNum} · {meta.subject} · {meta.chapter} ·{" "}
            {meta.district}
          </p>
        </header>

        <section className="sheet-grid mt-6 gap-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-brand">
              Student handbook
            </h2>
            <MarkdownRenderer className="prose-sm">
              {lesson.student_handbook}
            </MarkdownRenderer>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold text-brand">Quiz</h2>
            <MarkdownRenderer className="prose-sm">
              {lesson.quiz.questions}
            </MarkdownRenderer>
          </div>
        </section>

        {lesson.parent_engagement_card ? (
          <section className="mt-10 border-t border-brown/25 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-brand">
              Parent engagement card
            </h2>
            <div className="max-w-md rounded-2xl border border-brown/25 bg-olive/5 p-4 text-sm leading-6 text-ink">
              {lesson.parent_engagement_card}
            </div>
          </section>
        ) : null}
      </article>

      {/* ───── Page 2: Homework Compression Slip — 4 identical slips per A4 ───── */}
      {homework ? (
        <article className="homework-slip-page print-page mx-auto my-6 max-w-[210mm] rounded-2xl bg-white p-8 text-ink shadow-soft ring-1 ring-brown/20">
          <header className="mb-4 border-b border-brown/25 pb-3">
            <h2 className="text-xl font-bold text-brand">
              Homework Compression Slips
            </h2>
            <p className="mt-1 text-xs text-ink/70">
              Cut along the grid lines. One slip per student, 4 per A4 page.
            </p>
          </header>
          <div className="homework-slip-grid grid grid-cols-2 grid-rows-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="homework-slip flex flex-col rounded-2xl border-2 border-dashed border-brown/40 p-4"
              >
                <div className="text-sm font-bold text-brand">
                  {homework.title}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-ink/60">
                  Class {meta.classNum} · {meta.subject} · {meta.chapter}
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-ink">
                  {homework.instructions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-3 text-[11px] font-medium text-ink/70">
                  ⏱ {homework.estimated_time_minutes} min · 📦 Bring:{" "}
                  {homework.bring_to_class}
                </div>
                <div className="mt-2 border-t border-dotted border-brown/40 pt-2 text-[10px] text-ink/60">
                  Student name: _______________________
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </>
  );
}
