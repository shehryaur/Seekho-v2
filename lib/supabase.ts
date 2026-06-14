/**
 * lib/supabase.ts — Supabase client + typed helpers for Seekho Engine.
 *
 * Post-pruning notes:
 *   - Community-pool, exam-paper, coverage-report, and substitute-UUID helpers
 *     have been removed. The remaining surface area is the daily planning loop
 *     (lesson generation, lesson lookup by share token, analytics) plus the
 *     NEW verified_context flywheel.
 *
 * Phase 3 additions:
 *   - VerifiedSnippet type
 *   - saveVerifiedSnippet(): thumbs-up insert
 *   - getTopVerifiedSnippets(): top-voted by district, used by buildPrompt
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { LOCAL_DISTRICTS, fallbackDistrict } from "./districts";

let _browser: SupabaseClient | null | undefined;
let _admin: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (_browser !== undefined) return _browser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    _browser = null;
    return null;
  }
  _browser = createClient(url, key, {
    auth: { persistSession: typeof window !== "undefined" },
  });
  return _browser;
}

export function supabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined")
    throw new Error("Server-only helper.");
  if (_admin !== undefined) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    _admin = null;
    return null;
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface District {
  name: string;
  province: string;
  economy: string;
  landmarks: string;
  transport: string;
  food: string;
  occupations: string;
  nature: string;
  local_names: string;
  school_type: string;
  connectivity: string;
  board: string;
}

export interface HomeworkJson {
  title: string;
  instructions: string[];
  estimated_time_minutes: number;
  bring_to_class: string;
}

export interface QuizJson {
  questions: string;
  answer_key: string;
}

export interface LessonJson {
  teacher_guide: string;
  student_handbook: string;
  class_activity: string;
  quiz: QuizJson;
  homework?: HomeworkJson;
  parent_engagement_card?: string;
  _fallback?: boolean;
}

export interface MultiGradeMix {
  enabled: boolean;
  belowGrade: number;
  atGrade: number;
  aboveGrade: number;
}

export interface GeneratedLesson {
  id?: number;
  school_name: string;
  district: string;
  class_num: number;
  subject: string;
  chapter: string;
  topic: string;
  language: string;
  output_mode: string;
  class_profile: string;
  content: string;
  inventory?: string[];
  resource_level?: "low" | "medium";
  multi_grade_enabled?: boolean;
  multi_grade_mix?: MultiGradeMix;
  homework_json?: HomeworkJson | null;
  parent_engagement_card?: string | null;
  parent_card_generated?: boolean;
  average_score?: number | null;
  lesson_went_well?: string | null;
  root_cause?: string | null;
  word_count?: number;
  share_token?: string;
  created_at?: string;
}

/** A teacher-verified, thumbs-up snippet for the local analogy flywheel. */
export interface VerifiedSnippet {
  id?: number;
  district: string;
  class_num: number | null;
  subject: string | null;
  section: string; // teacher_guide | student_handbook | ...
  snippet: string;
  votes: number;
  created_at?: string;
}

/* ─── District helpers ──────────────────────────────────────────────── */

export async function getDistrict(name: string): Promise<District> {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("districts")
      .select("*")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data as District;
  }
  return (
    LOCAL_DISTRICTS.find(
      (d) => d.name.toLowerCase() === name.toLowerCase(),
    ) ?? fallbackDistrict(name)
  );
}

export async function getAllDistricts(): Promise<District[]> {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("districts")
      .select("*")
      .order("name");
    if (!error && data?.length) return data as District[];
  }
  return LOCAL_DISTRICTS;
}

/* ─── Lesson persistence ────────────────────────────────────────────── */

function inferResourceLevel(inventory: string[] = []): "low" | "medium" {
  return inventory.length <= 6 ? "low" : "medium";
}

export async function saveLesson(
  lesson: Omit<
    GeneratedLesson,
    "id" | "share_token" | "created_at" | "word_count"
  >,
): Promise<GeneratedLesson | null> {
  const client = supabase();
  const enriched: GeneratedLesson = {
    ...lesson,
    word_count: lesson.content.split(/\s+/).length,
    resource_level: lesson.resource_level ?? inferResourceLevel(lesson.inventory),
    parent_card_generated: Boolean(lesson.parent_engagement_card),
  };
  if (!client) {
    // No Supabase configured — return a local-only ID so the UI still works.
    return {
      ...enriched,
      share_token: uuidv4().replace(/-/g, "").slice(0, 16),
    };
  }
  const { data, error } = await client
    .from("generated_lessons")
    .insert(enriched)
    .select("*")
    .single();
  if (error || !data) return null;
  return data as GeneratedLesson;
}

export async function getLessonByToken(
  token: string,
): Promise<GeneratedLesson | null> {
  const client = supabase();
  if (!client) return null;
  const { data, error } = await client
    .from("generated_lessons")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as GeneratedLesson;
}

export async function logAnalytics(
  payload: Record<string, unknown>,
): Promise<void> {
  const client = supabase();
  if (!client) return;
  try {
    await client.from("analytics").insert(payload);
  } catch {
    /* swallow — analytics is best-effort */
  }
}

/* ─── Verified Context (Local Analogy Flywheel) ─────────────────────── */

/**
 * Save a teacher's thumbs-up. If an identical snippet+district already exists,
 * increment its votes; otherwise insert a new row with votes=1.
 *
 * Uses the anon client because the table has a permissive insert/update RLS
 * policy (see migration). For server contexts you may pass the admin client.
 */
export async function saveVerifiedSnippet(input: {
  district: string;
  classNum?: number | null;
  subject?: string | null;
  section: string;
  snippet: string;
}): Promise<{ ok: boolean; votes: number } | null> {
  const client = supabaseAdmin() ?? supabase();
  if (!client) return null;
  const trimmed = input.snippet.trim();
  if (!trimmed) return null;

  const { data: existing } = await client
    .from("verified_context")
    .select("id, votes")
    .eq("district", input.district)
    .eq("snippet", trimmed)
    .maybeSingle();

  if (existing) {
    const nextVotes = Number((existing as { votes: number }).votes ?? 0) + 1;
    await client
      .from("verified_context")
      .update({ votes: nextVotes })
      .eq("id", (existing as { id: number }).id);
    return { ok: true, votes: nextVotes };
  }

  const { error } = await client.from("verified_context").insert({
    district: input.district,
    class_num: input.classNum ?? null,
    subject: input.subject ?? null,
    section: input.section,
    snippet: trimmed,
    votes: 1,
  });
  if (error) return null;
  return { ok: true, votes: 1 };
}

/**
 * Fetch the top-voted snippets for a district. Used by buildPrompt() to inject
 * gold-standard local examples into Gemini's system instructions.
 */
export async function getTopVerifiedSnippets(input: {
  district: string;
  classNum?: number | null;
  subject?: string | null;
  limit?: number;
}): Promise<string[]> {
  const client = supabase();
  if (!client) return [];

  let query = client
    .from("verified_context")
    .select("snippet, votes")
    .eq("district", input.district)
    .order("votes", { ascending: false })
    .limit(input.limit ?? 6);

  // Soft filters: we want district-matched snippets first, but we DON'T
  // filter aggressively on class/subject so the pool stays useful when
  // it's small. Callers can re-rank if needed.
  const { data } = await query;
  if (!data || data.length === 0) return [];
  return (data as { snippet: string }[]).map((row) => row.snippet);
}
