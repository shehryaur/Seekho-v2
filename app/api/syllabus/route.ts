/**
 * app/api/syllabus/route.ts
 *
 * Cascading dropdown data source. Tries Supabase first, falls back to the
 * static `lib/pctb_syllabus.ts` data so the app keeps working offline.
 *
 *   GET /api/syllabus?classNum=6
 *       → { subjects: string[] }
 *
 *   GET /api/syllabus?classNum=6&subject=Science
 *       → { chapters: string[] }
 *
 *   GET /api/syllabus?classNum=6&subject=Science&chapter=Atoms+and+Molecules
 *       → { topics: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getSubjectsForClass,
  getChaptersForSubject,
  getTopicsForChapter,
} from "@/lib/pctb_syllabus";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h ISR for this cascading data

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classNum = Number(searchParams.get("classNum"));
  const subject = searchParams.get("subject");
  const chapter = searchParams.get("chapter");

  if (!classNum || classNum < 1 || classNum > 12) {
    return NextResponse.json(
      { error: "classNum (1-12) is required" },
      { status: 400 },
    );
  }

  const client = supabase();

  // ── Topics ────────────────────────────────────────────────────────────
  if (subject && chapter) {
    if (client) {
      const { data } = await client
        .from("syllabus")
        .select("topics")
        .eq("class_num", classNum)
        .eq("subject", subject)
        .eq("chapter", chapter)
        .maybeSingle();
      if (data?.topics?.length) {
        return NextResponse.json({ topics: data.topics as string[] });
      }
    }
    return NextResponse.json({
      topics: getTopicsForChapter(classNum, subject, chapter),
    });
  }

  // ── Chapters ──────────────────────────────────────────────────────────
  if (subject) {
    if (client) {
      const { data } = await client
        .from("syllabus")
        .select("chapter, chapter_num")
        .eq("class_num", classNum)
        .eq("subject", subject)
        .order("chapter_num");
      if (data?.length) {
        return NextResponse.json({
          chapters: data.map((r) => (r as { chapter: string }).chapter),
        });
      }
    }
    return NextResponse.json({
      chapters: getChaptersForSubject(classNum, subject),
    });
  }

  // ── Subjects ──────────────────────────────────────────────────────────
  if (client) {
    const { data } = await client
      .from("syllabus")
      .select("subject")
      .eq("class_num", classNum);
    if (data?.length) {
      const subjects = Array.from(
        new Set(data.map((r) => (r as { subject: string }).subject)),
      ).sort();
      return NextResponse.json({ subjects });
    }
  }
  return NextResponse.json({ subjects: getSubjectsForClass(classNum) });
}
