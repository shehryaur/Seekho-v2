/**
 * app/api/parent-whatsapp/route.ts
 *
 * Produces a short, English-only structured WhatsApp message for parents,
 * built from the already-generated lesson pack.
 *
 * IMPORTANT — DOES NOT TOUCH EXISTING LESSON LOGIC:
 *   - The `parent_engagement_card` variable in your lesson JSON stays
 *     Roman Urdu, exactly as your buildPrompt asks for it.
 *   - This endpoint only takes the FINISHED lesson and rewrites a short
 *     English message + an English translation of the parent_engagement_card
 *     alongside, in a stable JSON shape.
 *
 * Cost: one short Gemini 2.5 Flash call, ~600 tokens out.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
    classNum: z.number().int().min(1).max(12),
    subject: z.string().min(1),
    chapter: z.string().min(1),
    topic: z.string().optional().default(""),
    teacherGuide: z.string().optional().default(""),
    studentHandbook: z.string().optional().default(""),
    classActivity: z.string().optional().default(""),
    homeworkTitle: z.string().optional().default(""),
    homeworkInstructions: z.array(z.string()).optional().default([]),
    homeworkBring: z.string().optional().default(""),
    parentEngagementCard: z.string().optional().default(""),
});

let client: GoogleGenerativeAI | null = null;
function ai() {
    if (client) return client;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    client = new GoogleGenerativeAI(key);
    return client;
}

const SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        classroom_bullets: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "What we did in classroom today, 3-5 short factual bullet points in clear English.",
        },
        home_bullets: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "What to do at home tonight, 2-4 specific actionable steps in clear English.",
        },
        optional_note: {
            type: SchemaType.STRING,
            description:
                "Optional short friendly note to parents in English (1-2 sentences).",
        },
        parent_engagement_card_english: {
            type: SchemaType.STRING,
            description:
                "Faithful English translation of the provided parent_engagement_card (Roman Urdu source). Keep meaning, soften phrasing for a WhatsApp message.",
        },
    },
    required: [
        "classroom_bullets",
        "home_bullets",
        "optional_note",
        "parent_engagement_card_english",
    ],
} as const;

export async function POST(req: NextRequest) {
    let body: z.infer<typeof Body>;
    try {
        body = Body.parse(await req.json());
    } catch (error) {
        return NextResponse.json(
            {
                error: "Invalid body",
                details:
                    error instanceof z.ZodError ? error.flatten() : String(error),
            },
            { status: 400 },
        );
    }

    const homeworkBlock =
        body.homeworkInstructions.length > 0
            ? `HOMEWORK TITLE: ${body.homeworkTitle}
HOMEWORK STEPS:
${body.homeworkInstructions.map((i) => `- ${i}`).join("\n")}
BRING TO CLASS: ${body.homeworkBring}`
            : "HOMEWORK: none assigned today.";

    const prompt = `You are writing a short WhatsApp update from a Pakistani schoolteacher to parents.

CLASS: Class ${body.classNum} ${body.subject}
CHAPTER: ${body.chapter}${body.topic ? `\nTOPIC: ${body.topic}` : ""}

CLASSROOM CONTENT SUMMARY (from the lesson pack):
--- TEACHER GUIDE ---
${(body.teacherGuide || "").slice(0, 1800)}
--- STUDENT HANDBOOK ---
${(body.studentHandbook || "").slice(0, 1800)}
--- CLASS ACTIVITY ---
${(body.classActivity || "").slice(0, 1500)}

${homeworkBlock}

PARENT ENGAGEMENT CARD (Roman Urdu source, translate it faithfully to English):
${body.parentEngagementCard || "(none)"}

RULES
- Output STRICTLY in standard English. No Roman Urdu. No Urdu script.
- Be specific to what the lesson actually covered. Do not say "we learned a new concept".
- "classroom_bullets": 3 to 5 short bullets, each starting with a verb (e.g. "Introduced", "Solved", "Discussed"). Each bullet must reference a real thing from the teacher guide or activity.
- "home_bullets": 2 to 4 specific things the child should do at home tonight. Use any homework provided above. If no homework was assigned, use the parent engagement card hints.
- "optional_note": 1 short friendly sentence, like a kind reminder. Must be optional in tone (something a teacher might or might not send).
- "parent_engagement_card_english": clean English translation of the parent engagement card, keeping its 3 parent questions.
- Use plain text only. No markdown headings, no asterisks. Output ONLY the JSON described in the schema.`;

    const model = ai().getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA as unknown as object,
            temperature: 0.45,
            maxOutputTokens: 1200,
        },
    });

    try {
        const response = await model.generateContent(prompt);
        const raw = response.response.text();
        const parsed = JSON.parse(raw) as {
            classroom_bullets: string[];
            home_bullets: string[];
            optional_note: string;
            parent_engagement_card_english: string;
        };
        return NextResponse.json({ ok: true, ...parsed });
    } catch (error) {
        console.error("[parent-whatsapp] failed", error);
        return NextResponse.json(
            {
                ok: false,
                error: "Could not build the WhatsApp message.",
                details: String(error),
            },
            { status: 502 },
        );
    }
}
