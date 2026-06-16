/**
 * lib/lessonPipeline.ts
 *
 * Seekho Engine — Partitioned Lesson Generation Pipeline (v4)
 *
 * WHY THIS EXISTS
 * ---------------
 * The previous single-call pipeline asked Gemini to produce six big
 * Markdown blobs (teacher_guide, student_handbook, class_activity, quiz
 * questions + answer_key, homework, parent_engagement_card) inside ONE
 * JSON response. For Class 9–12 + multi-grade + verified context the
 * response routinely crossed Gemini Flash's effective per-call budget and
 * was truncated with finishReason="MAX_TOKENS", causing a 413 in the
 * frontend.
 *
 * WHAT CHANGED
 * ------------
 * The lesson is now produced in TWO phases:
 *
 *   Phase 0 (cheap, ~600 output tokens):
 *     Generate a small "lesson seed" JSON — big_question, prerequisites,
 *     key_terms, misconceptions, concept_ladder, classroom_examples.
 *     This is the SHARED BRAIN that every later silo will read.
 *
 *   Phase 1 (parallel, three silos, each up to 16k output tokens):
 *     Three Gemini calls run in parallel:
 *
 *       Silo A: teacher_guide
 *       Silo B: student_handbook + class_activity
 *       Silo C: quiz + homework + parent_engagement_card
 *
 *     Each silo receives the SAME seed, so all outputs stay internally
 *     consistent. Each silo has its OWN output budget, so none gets
 *     truncated. Each silo is schema-constrained, so none returns
 *     malformed JSON.
 *
 * WHY THIS IS BETTER THAN A 2-CALL SEQUENTIAL PIPELINE
 * -----------------------------------------------------
 *   - Parallelism shortens wall-clock latency
 *     (1x seed + max(silo A, silo B, silo C) instead of 3x sequential).
 *   - Each silo gets dedicated reasoning budget => HIGHER quality per
 *     section, not lower.
 *   - Per-silo retry: if one silo fails, only that silo is regenerated.
 *
 * BACKWARDS COMPATIBILITY
 * -----------------------
 * The returned shape is identical to the previous `LessonJson` so no UI
 * or downstream code needs changes. `buildPrompt` / `parseLessonJson` /
 * `LESSON_SCHEMA` / `MODEL_NAME` are NOT modified.
 */

import {
    GoogleGenerativeAI,
    type GenerationConfig,
    type GenerativeModel,
} from "@google/generative-ai";
import { buildPrompt, type BuildPromptInput } from "./buildPrompt";
import {
    LESSON_SEED_SCHEMA,
    SILO_GUIDE_SCHEMA,
    SILO_STUDENT_ACT_SCHEMA,
    SILO_ASSESS_SCHEMA,
} from "./lessonSchema";
import type { LessonJson } from "./supabase";

/* ─────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────── */

export interface LessonSeed {
    big_question: string;
    prerequisites: string[];
    key_terms: { term: string; definition_local: string }[];
    misconceptions: string[];
    concept_ladder: {
        step1_local_analogy: string;
        step2_bridge: string;
        step3_pctb_definition: string;
    };
    classroom_examples: string[];
}

interface SiloGuide {
    teacher_guide: string;
}

interface SiloStudentAct {
    student_handbook: string;
    class_activity: string;
}

interface SiloAssess {
    quiz: { questions: string; answer_key: string };
    homework: {
        title: string;
        instructions: string[];
        estimated_time_minutes: number;
        bring_to_class: string;
    };
    parent_engagement_card: string;
}

export interface PipelineResult {
    lesson: LessonJson;
    seed: LessonSeed;
    /**
     * For ops/debugging: tells the route which silos succeeded vs were
     * filled by the safe-fallback. In healthy production this is all true.
     */
    health: {
        seed_ok: boolean;
        guide_ok: boolean;
        student_activity_ok: boolean;
        assessment_ok: boolean;
    };
}

/* ─────────────────────────────────────────────────────────────────────
 * Gemini client (lazy singleton)
 * ───────────────────────────────────────────────────────────────────── */

let _ai: GoogleGenerativeAI | null = null;
function ai(): GoogleGenerativeAI {
    if (_ai) return _ai;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is missing.");
    _ai = new GoogleGenerativeAI(key);
    return _ai;
}

/** Same model used by the legacy route. */
const MODEL_NAME = "gemini-flash-latest";

/**
 * Per-call output budgets.
 *
 * Gemini 2.5 Flash supports up to 65,536 output tokens; the legacy 8192
 * was the actual bug for the single-call pipeline. We use generous budgets
 * per silo so even the longest Class 12 lesson cannot truncate.
 */
const SEED_MAX_TOKENS = 2048;
const SILO_GUIDE_MAX_TOKENS = 16384;
const SILO_STUDENT_ACT_MAX_TOKENS = 16384;
const SILO_ASSESS_MAX_TOKENS = 8192;

/* ─────────────────────────────────────────────────────────────────────
 * Helper: model factory with schema and thinking config
 * ───────────────────────────────────────────────────────────────────── */

function modelFor({
    schema,
    maxOutputTokens,
    temperature,
    light,
}: {
    schema: unknown;
    maxOutputTokens: number;
    temperature: number;
    /**
     * If true, disable Gemini thinking tokens. Used for the cheap seed
     * call (it's planning, deep reasoning not required) and the small
     * assessment silo. For the heavier guide / student+activity silos we
     * keep thinking ON for better quality.
     */
    light: boolean;
}): GenerativeModel {
    // We extend the SDK's GenerationConfig with `thinkingConfig`. The 0.21
    // SDK does not type that field but the underlying REST API accepts it,
    // so we cast through a permissive record.
    const generationConfig: GenerationConfig & {
        thinkingConfig?: { thinkingBudget: number };
    } = {
        responseMimeType: "application/json",
        responseSchema: schema as GenerationConfig["responseSchema"],
        temperature,
        maxOutputTokens,
    };
    if (light) {
        // Disable thinking tokens to reclaim the entire budget for output.
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }
    return ai().getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: generationConfig as GenerationConfig,
    });
}

/* ─────────────────────────────────────────────────────────────────────
 * Helper: safe JSON.parse with one repair pass
 * ───────────────────────────────────────────────────────────────────── */

function safeParse<T>(raw: string): T | null {
    if (!raw) return null;
    // 1) direct
    try {
        return JSON.parse(raw) as T;
    } catch {
        /* fall through */
    }
    // 2) strip ```json fences and try again
    const stripped = raw
        .replace(/^\uFEFF/, "")
        .replace(/^```(?:json|JSON)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
    try {
        return JSON.parse(stripped) as T;
    } catch {
        /* fall through */
    }
    // 3) slice between first { and last }
    const a = stripped.indexOf("{");
    const b = stripped.lastIndexOf("}");
    if (a !== -1 && b > a) {
        try {
            return JSON.parse(stripped.slice(a, b + 1)) as T;
        } catch {
            /* give up */
        }
    }
    return null;
}

/* ─────────────────────────────────────────────────────────────────────
 * Shared header derived from the existing buildPrompt
 * ───────────────────────────────────────────────────────────────────── */

/**
 * We REUSE the existing `buildPrompt(...)` so every locality / multi-grade
 * / verified-context / language / profile rule is identical to before.
 * The trick: we strip away the "CRITICAL OUTPUT FORMAT" section at the
 * bottom (since each silo has its own JSON schema), and use the rest as
 * the shared header for every Gemini call. This guarantees ALL silos
 * apply the same district + class + language + multi-grade rules.
 */
function sharedHeader(input: BuildPromptInput): string {
    const full = buildPrompt(input);
    const cutAt = full.indexOf("CRITICAL OUTPUT FORMAT");
    return cutAt > -1 ? full.slice(0, cutAt).trim() : full.trim();
}

/* ─────────────────────────────────────────────────────────────────────
 * Phase 0 — Lesson Seed
 * ───────────────────────────────────────────────────────────────────── */

async function generateSeed(input: BuildPromptInput): Promise<LessonSeed> {
    const header = sharedHeader(input);
    const prompt = `${header}

YOUR JOB IN THIS CALL
You are NOT writing the full lesson yet. You are creating a small SHARED LESSON SEED that several specialist writers will read and follow. The seed must be tight, locally specific, and curriculum-true.

Output STRICTLY the JSON described by the response schema. No prose outside the JSON.`;

    const model = modelFor({
        schema: LESSON_SEED_SCHEMA,
        maxOutputTokens: SEED_MAX_TOKENS,
        temperature: 0.4,
        light: true, // cheap planning, no deep thinking needed
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeParse<LessonSeed>(text);
    if (!parsed) throw new Error("Seed generation returned unparseable JSON.");
    return parsed;
}

/* ─────────────────────────────────────────────────────────────────────
 * Seed → human-readable injection block
 * ───────────────────────────────────────────────────────────────────── */

function seedBlock(seed: LessonSeed): string {
    const keyTerms = seed.key_terms
        .map((k) => `  - ${k.term}: ${k.definition_local}`)
        .join("\n");
    const examples = seed.classroom_examples.map((e) => `  - ${e}`).join("\n");
    const prereqs = seed.prerequisites.map((p) => `  - ${p}`).join("\n");
    const misc = seed.misconceptions.map((m) => `  - ${m}`).join("\n");
    return `
SHARED LESSON SEED (read carefully, every detail in your output MUST agree with this seed):
- Big question for this lesson:
    ${seed.big_question}
- Prerequisites students must already have:
${prereqs}
- Key terms (use these EXACT terms and definitions):
${keyTerms}
- Common misconceptions you must explicitly correct:
${misc}
- Concept ladder (use these EXACT three steps in this order anywhere a concept ladder is required):
    Step 1 (local analogy): ${seed.concept_ladder.step1_local_analogy}
    Step 2 (bridge):        ${seed.concept_ladder.step2_bridge}
    Step 3 (PCTB definition): ${seed.concept_ladder.step3_pctb_definition}
- Classroom examples you may reuse anywhere (each is district-specific):
${examples}
`;
}

/* ─────────────────────────────────────────────────────────────────────
 * Phase 1A — teacher_guide silo
 * ───────────────────────────────────────────────────────────────────── */

async function generateTeacherGuide(
    input: BuildPromptInput,
    seed: LessonSeed,
): Promise<SiloGuide> {
    const header = sharedHeader(input);
    const prompt = `${header}
${seedBlock(seed)}

YOUR JOB IN THIS CALL
Write ONLY the teacher_guide section.

teacher_guide MUST include, in this order:
1. A misconceptions table (use the seed's misconceptions list).
2. A prerequisites checklist (use the seed's prerequisites list).
3. A delivery table (what to say, what to write on the board, what to ask).
4. A 40-minute lesson timeline broken into minute blocks that SUM TO EXACTLY 40 MINUTES.
5. A wrap-up script the teacher reads aloud at the end.

Rules
- No paragraph walls. Use tables, numbered lists, and bullet points.
- Apply the language, profile, multi-grade, and verified-context rules above.
- No em dashes anywhere.

Output STRICTLY the JSON described by the response schema.`;

    const model = modelFor({
        schema: SILO_GUIDE_SCHEMA,
        maxOutputTokens: SILO_GUIDE_MAX_TOKENS,
        temperature: 0.6,
        light: false, // keep thinking on for pedagogical depth
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeParse<SiloGuide>(text);
    if (!parsed?.teacher_guide) {
        throw new Error("teacher_guide silo returned unparseable JSON.");
    }
    return parsed;
}

/* ─────────────────────────────────────────────────────────────────────
 * Phase 1B — student_handbook + class_activity silo
 * ───────────────────────────────────────────────────────────────────── */

async function generateStudentAndActivity(
    input: BuildPromptInput,
    seed: LessonSeed,
): Promise<SiloStudentAct> {
    const header = sharedHeader(input);
    const prompt = `${header}
${seedBlock(seed)}

YOUR JOB IN THIS CALL
Write ONLY two sections: student_handbook and class_activity. They share the same 40-minute timeline, so keep them aligned with each other.

student_handbook MUST include:
- The seed's big_question, framed for students.
- A Concept Ladder block using EXACTLY the seed's Step 1 / Step 2 / Step 3.
- A key terms table (use the seed's key_terms).
- A numbered explanation walking through the chapter focus.
- 3 quick-think questions at the end.

class_activity MUST include:
- A materials list (respect any inventory or low-resource rule above).
- A minute-by-minute 40-minute timeline that SUMS TO EXACTLY 40 MINUTES.
- Step-by-step teacher instructions.
- One short AI / home extension activity.
- If multi-grade mode is active above, three labeled parallel tracks (Foundation, Core, Extension) under the SAME timeline.

Rules
- No paragraph walls. Use tables, numbered lists, and bullet points.
- Apply the language, profile, multi-grade, and verified-context rules above.
- No em dashes anywhere.

Output STRICTLY the JSON described by the response schema.`;

    const model = modelFor({
        schema: SILO_STUDENT_ACT_SCHEMA,
        maxOutputTokens: SILO_STUDENT_ACT_MAX_TOKENS,
        temperature: 0.6,
        light: false,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeParse<SiloStudentAct>(text);
    if (!parsed?.student_handbook || !parsed?.class_activity) {
        throw new Error("student_activity silo returned unparseable JSON.");
    }
    return parsed;
}

/* ─────────────────────────────────────────────────────────────────────
 * Phase 1C — quiz + homework + parent_engagement_card silo
 * ───────────────────────────────────────────────────────────────────── */

async function generateAssessment(
    input: BuildPromptInput,
    seed: LessonSeed,
): Promise<SiloAssess> {
    const header = sharedHeader(input);
    const prompt = `${header}
${seedBlock(seed)}

YOUR JOB IN THIS CALL
Write ONLY the assessment payload: quiz, homework, and parent_engagement_card.

quiz.questions MUST follow the class-level question format above. Use:
- Part A: MCQs with explicit Bloom labels next to each question.
- Part B: short questions.
- Part C: one real-life application question rooted in the local context above.

quiz.answer_key MUST begin with the literal heading:
  TEACHER ANSWER KEY -- DO NOT DISTRIBUTE

homework MUST contain:
- title (short)
- instructions (3-5 short bullets)
- estimated_time_minutes (number, realistic for the class)
- bring_to_class (one concrete artifact)

parent_engagement_card MUST be exactly 150 words in Roman Urdu. It MUST contain:
- One home activity using household items only.
- Three specific parent questions.

Rules
- No em dashes anywhere.
- Apply the language, profile, multi-grade, and verified-context rules above.

Output STRICTLY the JSON described by the response schema.`;

    const model = modelFor({
        schema: SILO_ASSESS_SCHEMA,
        maxOutputTokens: SILO_ASSESS_MAX_TOKENS,
        temperature: 0.55,
        light: true, // small structured payload, thinking budget not needed
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeParse<SiloAssess>(text);
    if (
        !parsed?.quiz?.questions ||
        !parsed?.quiz?.answer_key ||
        !parsed?.homework ||
        !parsed?.parent_engagement_card
    ) {
        throw new Error("assessment silo returned unparseable JSON.");
    }
    return parsed;
}

/* ─────────────────────────────────────────────────────────────────────
 * Public entrypoint
 * ───────────────────────────────────────────────────────────────────── */

const SAFE_GUIDE = "(Regenerate this lesson — teacher guide silo failed.)";
const SAFE_STUDENT = "(Regenerate this lesson — student handbook silo failed.)";
const SAFE_ACTIVITY = "(Regenerate this lesson — class activity silo failed.)";
const SAFE_QUIZ = "(Regenerate this lesson — quiz silo failed.)";
const SAFE_ANSWERKEY =
    "TEACHER ANSWER KEY -- DO NOT DISTRIBUTE\n\n(Regenerate this lesson.)";
const SAFE_PARENT_CARD =
    "Aaj bachay ne class mein naya concept seekha. Ghar par 10 minute baith kar us se poochain ke is sabaq ka sab se aham nukta kya tha. Ek chhota ghar ka mashq mil kar kijiye aur bachay ko boliye ke woh apni soch zuban se samjhaye. Sawaal 1: Aaj tum ne kaunsi nayi baat seekhi? Sawaal 2: Is ko apni zindagi ki misaal se samjhao. Sawaal 3: Agar kal dost ko samjhana ho to kaise samjhao ge?";

const SAFE_HOMEWORK = {
    title: "Homework",
    instructions: [
        "Review today's lesson.",
        "Complete one short written task.",
        "Bring your notebook tomorrow.",
    ],
    estimated_time_minutes: 15,
    bring_to_class: "Completed notebook work",
};

/**
 * Produce a full LessonJson using the partitioned pipeline.
 *
 * @throws only if the seed call itself fails (rare). Silo failures are
 * caught and replaced with safe placeholders so the user always gets
 * a renderable result.
 */
export async function generateLessonPipeline(
    input: BuildPromptInput,
): Promise<PipelineResult> {
    // Phase 0 — must succeed; without the seed there is no shared brain.
    const seed = await generateSeed(input);

    // Phase 1 — fire all three silos in parallel.
    const [guide, studentAct, assess] = await Promise.allSettled([
        generateTeacherGuide(input, seed),
        generateStudentAndActivity(input, seed),
        generateAssessment(input, seed),
    ]);

    const guide_ok = guide.status === "fulfilled";
    const student_activity_ok = studentAct.status === "fulfilled";
    const assessment_ok = assess.status === "fulfilled";

    const teacher_guide =
        guide.status === "fulfilled" ? guide.value.teacher_guide : SAFE_GUIDE;

    const student_handbook =
        studentAct.status === "fulfilled"
            ? studentAct.value.student_handbook
            : SAFE_STUDENT;
    const class_activity =
        studentAct.status === "fulfilled"
            ? studentAct.value.class_activity
            : SAFE_ACTIVITY;

    const quiz =
        assess.status === "fulfilled"
            ? assess.value.quiz
            : { questions: SAFE_QUIZ, answer_key: SAFE_ANSWERKEY };
    const homework =
        assess.status === "fulfilled" ? assess.value.homework : SAFE_HOMEWORK;
    const parent_engagement_card =
        assess.status === "fulfilled"
            ? assess.value.parent_engagement_card
            : SAFE_PARENT_CARD;

    const lesson: LessonJson = {
        teacher_guide,
        student_handbook,
        class_activity,
        quiz,
        homework,
        parent_engagement_card,
        _fallback: !(guide_ok && student_activity_ok && assessment_ok),
    };

    return {
        lesson,
        seed,
        health: {
            seed_ok: true,
            guide_ok,
            student_activity_ok,
            assessment_ok,
        },
    };
}
