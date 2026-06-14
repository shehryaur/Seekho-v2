/**
 * lib/teachingProgress.ts
 *
 * Roadmap persistence helpers.
 *
 * Strategy:
 *   1. Generate a stable per-device teacher ID stored in localStorage.
 *   2. Read/write to Supabase `teaching_progress` table on every change.
 *   3. Mirror to localStorage as a cache so the UI is instant and survives
 *      brief offline periods.
 *
 * When you later add Supabase Auth, replace `getOrCreateTeacherId()` with
 * `supabase.auth.getUser().id`.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
    SUPABASE_URL && SUPABASE_ANON
        ? createClient(SUPABASE_URL, SUPABASE_ANON)
        : null;

const DEVICE_ID_KEY = "seekho:deviceId";
const PROGRESS_CACHE_KEY = "seekho:completedChapters:v3";

export interface ProgressRow {
    chapter: string;
    taughtOn: string; // YYYY-MM-DD
}

export type ProgressMap = Record<string, ProgressRow[]>; // key: `${class}/${subject}`

function uuid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getOrCreateTeacherId(): string {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = uuid();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

function readCache(): ProgressMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
        return raw ? (JSON.parse(raw) as ProgressMap) : {};
    } catch {
        return {};
    }
}

function writeCache(map: ProgressMap) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(map));
    } catch {
        // ignore quota errors
    }
}

/** Load all progress for the current teacher (one fetch, cached for fast UI). */
export async function loadAllProgress(): Promise<ProgressMap> {
    const cache = readCache();
    if (!supabase) return cache;

    try {
        const teacherId = getOrCreateTeacherId();
        const { data, error } = await supabase
            .from("teaching_progress")
            .select("class_num, subject, chapter, taught_on")
            .eq("teacher_id", teacherId);
        if (error) throw error;

        const fresh: ProgressMap = {};
        (data ?? []).forEach((row) => {
            const key = `${row.class_num}/${row.subject}`;
            const entry: ProgressRow = {
                chapter: row.chapter,
                taughtOn: row.taught_on,
            };
            fresh[key] = [...(fresh[key] ?? []), entry];
        });

        writeCache(fresh);
        return fresh;
    } catch (err) {
        console.warn("[teachingProgress] Supabase load failed, using cache.", err);
        return cache;
    }
}

/** Mark one chapter as taught. Writes to Supabase + cache. */
export async function markChapterTaught(args: {
    classNum: number;
    subject: string;
    chapter: string;
    taughtOn: string;
}): Promise<void> {
    const teacherId = getOrCreateTeacherId();
    const key = `${args.classNum}/${args.subject}`;

    // Update cache first for instant UI feedback.
    const cache = readCache();
    cache[key] = [
        ...(cache[key] ?? []).filter((c) => c.chapter !== args.chapter),
        { chapter: args.chapter, taughtOn: args.taughtOn },
    ];
    writeCache(cache);

    if (!supabase) return;
    const { error } = await supabase.from("teaching_progress").upsert(
        {
            teacher_id: teacherId,
            class_num: args.classNum,
            subject: args.subject,
            chapter: args.chapter,
            taught_on: args.taughtOn,
        },
        { onConflict: "teacher_id,class_num,subject,chapter" },
    );
    if (error) {
        console.warn("[teachingProgress] upsert failed", error);
    }
}

/** Remove a chapter from progress. */
export async function unmarkChapter(args: {
    classNum: number;
    subject: string;
    chapter: string;
}): Promise<void> {
    const teacherId = getOrCreateTeacherId();
    const key = `${args.classNum}/${args.subject}`;

    const cache = readCache();
    cache[key] = (cache[key] ?? []).filter((c) => c.chapter !== args.chapter);
    writeCache(cache);

    if (!supabase) return;
    const { error } = await supabase
        .from("teaching_progress")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("class_num", args.classNum)
        .eq("subject", args.subject)
        .eq("chapter", args.chapter);
    if (error) {
        console.warn("[teachingProgress] delete failed", error);
    }
}
