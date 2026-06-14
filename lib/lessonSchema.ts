/**
 * lib/lessonSchema.ts
 *
 * Schema-constrained decoding for Gemini 2.5 Flash.
 *
 * When passed as `generationConfig.responseSchema`, Gemini PHYSICALLY CANNOT
 * return malformed JSON. This kills the entire class of parser failures that
 * was producing the "JSON parsing failed -- please regenerate the lesson"
 * error in the Quiz tab.
 *
 * Used by:
 *   - app/api/generate/route.ts          (full lesson pack)
 *   - app/api/weekly-planner/route.ts    (per-chapter weekly previews)
 *   - app/api/weekly-planner-v2/route.ts (day-by-day structured week plan)
 */

import { SchemaType } from "@google/generative-ai";

/* ─────────────────────────────────────────────────────────────────────
 * FULL LESSON PACK SCHEMA
 * Used by /api/generate. Locks every tab so none can silently fail.
 * ───────────────────────────────────────────────────────────────────── */
export const LESSON_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        teacher_guide: {
            type: SchemaType.STRING,
            description:
                "Markdown teacher guide with misconceptions, prerequisites, delivery table, activity notes, wrap-up script.",
        },
        student_handbook: {
            type: SchemaType.STRING,
            description:
                "Markdown student handout with big question, concept ladder, key terms table, numbered explanation, quick think questions.",
        },
        class_activity: {
            type: SchemaType.STRING,
            description:
                "Markdown 40-minute activity. Materials, minute-by-minute timeline, step-by-step instructions, AI home activity, multi-grade tracks if active.",
        },
        quiz: {
            type: SchemaType.OBJECT,
            properties: {
                questions: {
                    type: SchemaType.STRING,
                    description:
                        "Markdown quiz: Part A MCQs, Part B short questions, Part C real-life application questions. Plain markdown text only.",
                },
                answer_key: {
                    type: SchemaType.STRING,
                    description:
                        "Markdown answer key. MUST begin with the literal heading 'TEACHER ANSWER KEY -- DO NOT DISTRIBUTE'.",
                },
            },
            required: ["questions", "answer_key"],
        },
        homework: {
            type: SchemaType.OBJECT,
            properties: {
                title: { type: SchemaType.STRING },
                instructions: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                },
                estimated_time_minutes: { type: SchemaType.NUMBER },
                bring_to_class: { type: SchemaType.STRING },
            },
            required: ["title", "instructions", "estimated_time_minutes", "bring_to_class"],
        },
        parent_engagement_card: {
            type: SchemaType.STRING,
            description:
                "Exactly 150 words in Roman Urdu. One home activity using household items plus three specific parent questions.",
        },
    },
    required: [
        "teacher_guide",
        "student_handbook",
        "class_activity",
        "quiz",
        "homework",
        "parent_engagement_card",
    ],
} as const;

/* ─────────────────────────────────────────────────────────────────────
 * WEEKLY PREVIEW SCHEMA (legacy v1 endpoint)
 * Used by /api/weekly-planner. One per chapter, trimmed.
 * ───────────────────────────────────────────────────────────────────── */
export const WEEKLY_PREVIEW_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        teacher_guide: { type: SchemaType.STRING },
        student_handbook: { type: SchemaType.STRING },
        class_activity: { type: SchemaType.STRING },
    },
    required: ["teacher_guide", "student_handbook", "class_activity"],
} as const;

/* ─────────────────────────────────────────────────────────────────────
 * STRUCTURED WEEK PLAN SCHEMA (new v2 endpoint)
 * Used by /api/weekly-planner-v2. AI fills a day-by-day grid given the
 * teacher's coverage targets per chapter.
 * ───────────────────────────────────────────────────────────────────── */
export const WEEK_PLAN_V2_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        days: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    day_number: { type: SchemaType.NUMBER },
                    day_label: {
                        type: SchemaType.STRING,
                        description: "e.g. 'Day 1 (Monday)' or 'Day 1'",
                    },
                    chapter: { type: SchemaType.STRING },
                    topic_slice: {
                        type: SchemaType.STRING,
                        description:
                            "Which slice of the chapter is covered this day, e.g. 'Algebra: Sections 1.1-1.3 (Variables and Expressions)'.",
                    },
                    warmup: {
                        type: SchemaType.STRING,
                        description: "5-minute warm-up script the teacher reads aloud.",
                    },
                    core_teach: {
                        type: SchemaType.STRING,
                        description:
                            "Markdown core teaching plan with examples, board work, and questions to ask.",
                    },
                    practice: {
                        type: SchemaType.STRING,
                        description:
                            "Markdown student practice / worksheet. Include 3-6 problems with increasing difficulty.",
                    },
                    exit_ticket: {
                        type: SchemaType.STRING,
                        description:
                            "3 short questions students answer in the last 3 minutes to prove they understood today's slice.",
                    },
                    estimated_minutes: { type: SchemaType.NUMBER },
                },
                required: [
                    "day_number",
                    "day_label",
                    "chapter",
                    "topic_slice",
                    "warmup",
                    "core_teach",
                    "practice",
                    "exit_ticket",
                ],
            },
        },
        weekly_summary: {
            type: SchemaType.STRING,
            description:
                "2-3 sentence summary the teacher can show the principal: what will be covered and what students will be able to do by Friday.",
        },
    },
    required: ["days", "weekly_summary"],
} as const;
