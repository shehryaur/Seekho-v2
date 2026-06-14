"use client";

/**
 * components/ParentWhatsAppCard.tsx
 *
 * Self-contained UI block for the Parent tab. Generates a structured English
 * WhatsApp message + a separate copyable "optional note", from the lesson
 * data already present in the page.
 *
 * IMPORTANT — DOES NOT TOUCH EXISTING LESSON LOGIC:
 *   This component does not read or mutate any of your existing lesson
 *   variables (teacher_guide, student_handbook, parent_engagement_card,
 *   etc). It receives them via props and only forwards them to the new
 *   /api/parent-whatsapp endpoint. parent_engagement_card stays exactly
 *   as your buildPrompt produced it (Roman Urdu).
 */

import * as React from "react";
import { toast } from "sonner";
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toWhatsAppUrl } from "@/lib/utils";
import type { LessonJson } from "@/lib/supabase";

interface Props {
    classNum: number | string;
    subject: string;
    chapter: string;
    topic?: string;
    lesson: LessonJson;
}

interface ParentMessage {
    classroom_bullets: string[];
    home_bullets: string[];
    optional_note: string;
    parent_engagement_card_english: string;
}

export function ParentWhatsAppCard({
    classNum,
    subject,
    chapter,
    topic,
    lesson,
}: Props) {
    const [data, setData] = React.useState<ParentMessage | null>(null);
    const [loading, setLoading] = React.useState(false);

    async function generate() {
        setLoading(true);
        try {
            const r = await fetch("/api/parent-whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classNum: Number(classNum),
                    subject,
                    chapter,
                    topic: topic || "",
                    teacherGuide: lesson.teacher_guide,
                    studentHandbook: lesson.student_handbook,
                    classActivity: lesson.class_activity,
                    homeworkTitle: lesson.homework?.title || "",
                    homeworkInstructions: lesson.homework?.instructions || [],
                    homeworkBring: lesson.homework?.bring_to_class || "",
                    parentEngagementCard: lesson.parent_engagement_card || "",
                }),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                toast.error(err.error || `WhatsApp build failed (HTTP ${r.status})`);
                return;
            }
            const json = (await r.json()) as ParentMessage & { ok: boolean };
            setData(json);
            toast.success("WhatsApp message ready.");
        } catch (err) {
            toast.error(`Network error: ${String(err)}`);
        } finally {
            setLoading(false);
        }
    }

    const fullText = data ? buildFullMessage(data) : "";

    async function copyText(text: string, label: string) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied.`);
        } catch {
            toast.error("Could not copy.");
        }
    }

    function openOnWhatsApp(text: string) {
        if (!text) return;
        window.open(toWhatsAppUrl(text), "_blank", "noopener,noreferrer");
    }

    return (
        <div className="mt-6 rounded-2xl border border-emerald-700/20 bg-emerald-50/55 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-900">
                    <MessageCircle className="h-5 w-5" />
                    <h4 className="text-base font-semibold">
                        WhatsApp message for parents (English)
                    </h4>
                </div>
                <button
                    type="button"
                    onClick={generate}
                    disabled={loading}
                    className="seekho-btn-primary"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Building…
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            {data ? "Regenerate" : "Build WhatsApp message"}
                        </>
                    )}
                </button>
            </div>

            {!data && !loading && (
                <p className="mt-2 text-sm text-ink/70">
                    We will turn this lesson into a short standard-English WhatsApp
                    message with clear headings parents can act on.
                </p>
            )}

            {data && (
                <div className="mt-5 space-y-4">
                    <Block
                        heading="What we did in classroom"
                        body={data.classroom_bullets.map((b) => `• ${b}`).join("\n")}
                        onCopy={() =>
                            copyText(
                                "What we did in classroom:\n" +
                                data.classroom_bullets.map((b) => `• ${b}`).join("\n"),
                                "Classroom summary",
                            )
                        }
                    />
                    <Block
                        heading="What to do at home"
                        body={data.home_bullets.map((b) => `• ${b}`).join("\n")}
                        onCopy={() =>
                            copyText(
                                "What to do at home:\n" +
                                data.home_bullets.map((b) => `• ${b}`).join("\n"),
                                "Home tasks",
                            )
                        }
                    />
                    <Block
                        heading="Optional note"
                        body={data.optional_note}
                        italic
                        onCopy={() => copyText(data.optional_note, "Optional note")}
                    />
                    {data.parent_engagement_card_english && (
                        <Block
                            heading="Parent engagement card (English translation)"
                            body={data.parent_engagement_card_english}
                            onCopy={() =>
                                copyText(
                                    data.parent_engagement_card_english,
                                    "Parent card (English)",
                                )
                            }
                        />
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => copyText(fullText, "Full WhatsApp message")}
                            className="seekho-btn-secondary"
                        >
                            <Copy className="h-4 w-4" />
                            Copy full message
                        </button>
                        <button
                            type="button"
                            onClick={() => openOnWhatsApp(fullText)}
                            className="seekho-btn-primary"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Send on WhatsApp
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Block({
    heading,
    body,
    italic,
    onCopy,
}: {
    heading: string;
    body: string;
    italic?: boolean;
    onCopy: () => void;
}) {
    if (!body || !body.trim()) return null;
    return (
        <div className="rounded-xl border border-emerald-700/12 bg-white/85 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    {heading}
                </div>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    title="Copy this section"
                >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                </button>
            </div>
            <pre
                className={`whitespace-pre-wrap font-sans text-sm leading-6 text-ink/85 ${italic ? "italic" : ""}`}
            >
                {body}
            </pre>
        </div>
    );
}

function buildFullMessage(d: ParentMessage) {
    const parts: string[] = [];
    parts.push("What we did in classroom:");
    d.classroom_bullets.forEach((b) => parts.push(`• ${b}`));
    parts.push("");
    parts.push("What to do at home:");
    d.home_bullets.forEach((b) => parts.push(`• ${b}`));
    if (d.optional_note) {
        parts.push("");
        parts.push(`Note: ${d.optional_note}`);
    }
    return parts.join("\n");
}
