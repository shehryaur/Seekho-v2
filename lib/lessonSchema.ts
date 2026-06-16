/**
 * lib/lessonSchema.ts
 *
 * Schema-constrained decoding for Gemini.
 *
 * v4 update — Partitioned Pipeline:
 *   The original LESSON_SCHEMA stays exported and untouched (no breaking
 *   changes for any other route that still imports it). On top of that we
 *   add three lightweight schemas used by the new partitioned generation
 *   pipeline in `lib/lessonPipeline.ts`:
 *
 *     LESSON_SEED_SCHEMA       – tiny shared "brain" of the lesson
 *     SILO_GUIDE_SCHEMA        – teacher_guide silo
 *     SILO_STUDENT_ACT_SCHEMA  – student_handbook + class_activity silo
 *     SILO_ASSESS_SCHEMA       – quiz + homework + parent_engagement_card silo
 *
 * Each silo silo gets its own 8k output budget. Together they reliably
 * produce the same LessonJson shape, but with ZERO truncation risk and
 * HIGHER quality per section (more focused reasoning per call).
 */

import { SchemaType } from "@google/generative-ai";

/* ─────────────────────────────────────────────────────────────────────
 * FULL LESSON PACK SCHEMA (legacy — kept for backward compatibility)
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
            required: [
                "title",
                "instructions",
                "estimated_time_minutes",
                "bring_to_class",
            ],
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
 * STRUCTURED WEEK PLAN SCHEMA
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

/* ─────────────────────────────────────────────────────────────────────
 * NEW v4 — PARTITIONED PIPELINE SCHEMAS
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Pass 0 — the shared "lesson seed".
 * This is the cheap planning call. All silos receive this so they stay
 * internally consistent (same big question, same key terms, same local
 * examples).
 */
export const LESSON_SEED_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        big_question: {
            type: SchemaType.STRING,
            description:
                "One single curious classroom question that drives this lesson. Specific to the chapter. 1 sentence.",
        },
        prerequisites: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "2-4 short bullets a teacher should check before starting. Plain text, no markdown.",
        },
        key_terms: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    term: { type: SchemaType.STRING },
                    definition_local: {
                        type: SchemaType.STRING,
                        description:
                            "One-sentence definition tied to the district's local context.",
                    },
                },
                required: ["term", "definition_local"],
            },
            description:
                "4-6 key terms for this chapter. Each MUST include a one-sentence definition tied to the district's local context.",
        },
        misconceptions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "2-3 common wrong-ideas students hold for this chapter. Plain text, no markdown.",
        },
        concept_ladder: {
            type: SchemaType.OBJECT,
            properties: {
                step1_local_analogy: {
                    type: SchemaType.STRING,
                    description:
                        "Step 1: a vivid 1-sentence analogy from the district's daily life (food, transport, occupation).",
                },
                step2_bridge: {
                    type: SchemaType.STRING,
                    description:
                        "Step 2: 1 sentence that bridges the local analogy to the textbook idea.",
                },
                step3_pctb_definition: {
                    type: SchemaType.STRING,
                    description:
                        "Step 3: 1-sentence PCTB-style formal definition.",
                },
            },
            required: [
                "step1_local_analogy",
                "step2_bridge",
                "step3_pctb_definition",
            ],
        },
        classroom_examples: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "3-4 short classroom examples that any later section may reuse. Each example must mention a specific landmark, food item, or occupation from the district.",
        },
    },
    required: [
        "big_question",
        "prerequisites",
        "key_terms",
        "misconceptions",
        "concept_ladder",
        "classroom_examples",
    ],
} as const;

/** Silo A: teacher_guide only. */
export const SILO_GUIDE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        teacher_guide: {
            type: SchemaType.STRING,
            description:
                "Markdown teacher guide. Include: misconceptions table, prerequisites checklist, delivery table, 40-minute timeline that sums to exactly 40 minutes, wrap-up script. Use the seed's big_question and concept_ladder. No em dashes.",
        },
    },
    required: ["teacher_guide"],
} as const;

/** Silo B: student_handbook + class_activity (tightly coupled by timeline). */
export const SILO_STUDENT_ACT_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        student_handbook: {
            type: SchemaType.STRING,
            description:
                "Markdown student handout. MUST contain: big question, concept ladder (Step 1 local analogy, Step 2 bridge, Step 3 PCTB definition), key terms table from the seed, numbered explanation, quick-think questions. No em dashes.",
        },
        class_activity: {
            type: SchemaType.STRING,
            description:
                "Markdown 40-minute classroom activity. MUST include materials, minute-by-minute timeline that sums to exactly 40 minutes, step-by-step teacher instructions, and (if multi-grade is active) Foundation / Core / Extension tracks under the same timeline. No em dashes.",
        },
    },
    required: ["student_handbook", "class_activity"],
} as const;

/** Silo C: quiz + homework + parent_engagement_card (small assessment pieces). */
export const SILO_ASSESS_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        quiz: {
            type: SchemaType.OBJECT,
            properties: {
                questions: {
                    type: SchemaType.STRING,
                    description:
                        "Markdown quiz. Part A MCQs (with Bloom labels), Part B short questions, Part C real-life application from the district context. Plain markdown text only.",
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
            required: [
                "title",
                "instructions",
                "estimated_time_minutes",
                "bring_to_class",
            ],
        },
        parent_engagement_card: {
            type: SchemaType.STRING,
            description:
                "Exactly 150 words in Roman Urdu. One home activity using household items plus three specific parent questions.",
        },
    },
    required: ["quiz", "homework", "parent_engagement_card"],
} as const;
