/**
 * lib/buildPrompt.ts — Seekho Engine prompt builder & JSON parser.
 *
 * Phase 1 fix (parseLessonJson):
 *   The previous parser only stripped outer markdown fences. Gemini 2.5 still
 *   occasionally returns leading prose, trailing prose, or truncated JSON.
 *   The new aggressive extractor:
 *     1. Trims, strips ```json fences, strips zero-width chars.
 *     2. Finds the first `{` and the last `}` and slices the substring.
 *     3. Tries strict JSON.parse first.
 *     4. If parsing fails (e.g. truncated), it falls back to a key-by-key
 *        regex extractor that safely lifts each top-level field as text,
 *        so the UI tabs never receive a raw blob.
 *
 * Phase 3 feature (verified_context):
 *   `buildPrompt` now accepts an optional `verifiedContext` array of teacher-
 *   approved local snippets (top-voted from Supabase). They are injected into
 *   the system instructions as gold-standard examples Gemini must imitate in
 *   tone and locality.
 */

import { getClassRule } from "./classConfig";
import type { District, LessonJson, MultiGradeMix } from "./supabase";

export type Language = "English" | "Roman Urdu" | "Pure Urdu (Script)";
export type Profile =
  | "Standard"
  | "Weak Class (Below Average)"
  | "Strong Class (Above Average)";

export interface BuildPromptInput {
  school: string;
  district: District;
  classNum: number;
  subject: string;
  chapter: string;
  topic: string;
  language: Language;
  profile: Profile;
  extra: string;
  topicsList: string[];
  urduTranslate?: boolean;
  lowResource?: boolean;
  inventory?: string[];
  multiGrade?: MultiGradeMix;
  /** Top-voted, teacher-verified local snippets pulled from Supabase. */
  verifiedContext?: string[];
}

const LANG_BLOCKS: Record<Language, string> = {
  "Pure Urdu (Script)":
    "LANGUAGE: Write ALL sections in pure Urdu Nastaliq script. Only exception: scientific symbols (CO2, H2O, km, PKR).",
  "Roman Urdu":
    "LANGUAGE: Write ALL sections in Roman Urdu, exactly as Pakistani families type on WhatsApp. NOT formal English. NOT Urdu script.",
  English:
    "LANGUAGE: Clear Pakistani English. Include Urdu or Punjabi terms in brackets where natural.",
};

function profileBlock(profile: Profile, classNum: number) {
  if (profile === "Weak Class (Below Average)") {
    return "CLASS PROFILE: Reduce vocabulary one full grade below stated class. No abstract concepts. Write for oral delivery. Repeat key term 3 times.";
  }
  if (profile === "Strong Class (Above Average)") {
    return "CLASS PROFILE: Add one [CHALLENGE] question above class level. Add a Did You Know fact beyond the PCTB chapter. Invite hypothesis formation.";
  }
  return `CLASS PROFILE: Standard complexity for Class ${classNum}.`;
}

function multiGradeBlock(multiGrade?: MultiGradeMix) {
  if (!multiGrade?.enabled) return "";
  return `
MULTI-GRADE CLASSROOM MODE ACTIVE.
The teacher reports this mixed classroom composition:
- Below grade: ${multiGrade.belowGrade}%
- At grade:    ${multiGrade.atGrade}%
- Above grade: ${multiGrade.aboveGrade}%

The main lesson MUST still feel like one coherent class. But inside class_activity you MUST include three clearly labeled parallel tracks:
1. Foundation Track for below-grade students
2. Core Track for at-grade students
3. Extension Track for above-grade students

All three tracks MUST use the exact same allowed materials and the same classroom timeline. Do NOT invent extra materials for any one group.
`;
}

function verifiedContextBlock(verifiedContext?: string[]) {
  if (!verifiedContext || verifiedContext.length === 0) return "";
  const snippets = verifiedContext
    .slice(0, 6)
    .map((snippet, index) => `(${index + 1}) ${snippet.trim()}`)
    .join("\n\n");
  return `
TEACHER-VERIFIED LOCAL EXAMPLES (gold standard, district-vetted):
These short snippets were thumbs-up'd by real teachers in this district.
Imitate their tone, locality, and concreteness. Do NOT copy them verbatim,
but the analogies and word problems you generate MUST feel as locally
specific as these:

${snippets}
`;
}

export function buildPrompt(input: BuildPromptInput): string {
  const {
    school,
    district: d,
    classNum,
    subject,
    chapter,
    topic,
    language,
    profile,
    extra,
    topicsList,
    urduTranslate = false,
    lowResource = false,
    inventory = [],
    multiGrade,
    verifiedContext,
  } = input;

  const cc = getClassRule(classNum);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const langBlock = LANG_BLOCKS[language] ?? LANG_BLOCKS.English;
  const profBlock = profileBlock(profile, classNum);
  const urduBlock = urduTranslate
    ? "URDU TRANSLATION ACTIVE: The student_handbook, class_activity, quiz.questions, homework slip, and parent engagement card MUST be written in readable Urdu or Roman Urdu as relevant. The teacher_guide may stay in English."
    : "";

  let inventoryBlock = "";
  if (inventory.length > 0) {
    inventoryBlock = `CLASSROOM INVENTORY MODE ACTIVE. The teacher has ONLY these items: ${inventory.join(", ")}. The class_activity and homework MUST use only these exact items, or no materials at all.`;
  } else if (lowResource) {
    inventoryBlock =
      "LOW-RESOURCE MODE ACTIVE: Use only paper, pen, chalk, string, plastic bottle, leaves, dirt, or stones.";
  }

  const topicsStr =
    topicsList.length > 0
      ? topicsList.map((t) => `  - ${t}`).join("\n")
      : "  - All topics in this chapter";
  const focusLine =
    topic && topic !== "Full Chapter Overview" ? topic : "Complete chapter";

  return `
You are SEEKHO ENGINE, a specialist Pakistani curriculum expert with 20 years in PCTB-aligned schools.

PARAMETERS
School: ${school} | District: ${d.name} | Board: ${d.board ?? "BISE"}
Class: ${classNum} | Subject: ${subject} | Chapter: ${chapter}
Focus: ${focusLine} | Date: ${today}
Language: ${language} | Profile: ${profile}

LOCAL CONTEXT FOR ${d.name.toUpperCase()}
Economy: ${d.economy} | Landmarks: ${d.landmarks}
Transport: ${d.transport} | Food: ${d.food}
Occupations: ${d.occupations} | Nature: ${d.nature}
Local Names: ${d.local_names} | School type: ${d.school_type}

LOCALISATION RULE: Every example, analogy, and word problem MUST use a specific name, place, or item from the local context above. If a child from ${d.name} would not instantly recognise it, replace it.

CHAPTER TOPICS:
${topicsStr}
PCTB REF: PCTB ${subject} Class ${classNum}, Chapter: ${chapter}

CLASS ${classNum} RULES
Vocabulary:   ${cc.vocab}
Questions:    ${cc.q}
Bloom level:  ${cc.bl}
Length target:${cc.len}
Note:         ${cc.n}

${langBlock}
${profBlock}
${urduBlock}
${inventoryBlock}
${multiGradeBlock(multiGrade)}
${verifiedContextBlock(verifiedContext)}
EXTRA INSTRUCTIONS: ${extra.trim() || "None."}

NON-NEGOTIABLE QUALITY RULES:
- No paragraph walls. Use tables, numbered lists, and bullet points.
- student_handbook MUST include a Concept Ladder: Step 1 local analogy, Step 2 bridge, Step 3 PCTB definition.
- quiz questions MUST carry Bloom labels.
- No em dashes anywhere.
- Both teacher_guide and class_activity MUST include an explicit 40-minute timeline with blocks that sum to exactly 40 minutes.
- If multi-grade mode is active, class_activity MUST include Foundation / Core / Extension tracks under the same timeline.

CRITICAL OUTPUT FORMAT:
Return ONLY valid JSON with this schema:
{
  "teacher_guide": "Markdown teacher guide with misconceptions, prerequisites, delivery table, activity notes and wrap-up script.",
  "student_handbook": "Markdown student handout with big question, concept ladder, key terms table, numbered explanation and quick think questions.",
  "class_activity": "Markdown 40-minute activity. Include materials, minute-by-minute timeline, step-by-step instructions, AI home activity, and multi-grade tracks if active.",
  "quiz": {
    "questions": "Markdown quiz questions only. Part A MCQs, Part B short questions, Part C real-life application in ${d.name} context.",
    "answer_key": "Markdown answer key beginning with TEACHER ANSWER KEY -- DO NOT DISTRIBUTE."
  },
  "homework": {
    "title": "Short homework title",
    "instructions": ["Bullet 1", "Bullet 2", "Bullet 3"],
    "estimated_time_minutes": 15,
    "bring_to_class": "Exact artifact the student should bring"
  },
  "parent_engagement_card": "Exactly 150 words in Roman Urdu. Include one home activity using household items and three specific parent questions."
}

Begin with { and end with }. Nothing else outside JSON.
`;
}

/* ─────────────────────────────────────────────────────────────────────
 * AGGRESSIVE JSON EXTRACTOR
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Walks the candidate substring and tries to repair common truncation
 * issues: unclosed strings, missing closing brackets, trailing commas.
 */
function repairTruncatedJson(candidate: string): string {
  let str = candidate.trim();

  // Trim trailing garbage after the last closing brace if any.
  const lastBrace = str.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace < str.length - 1) {
    str = str.slice(0, lastBrace + 1);
  }

  // Detect unbalanced quotes inside the JSON body — if an odd number of
  // unescaped quotes remain, close the string and the object.
  let inString = false;
  let escape = false;
  let openBraces = 0;
  let openBrackets = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  if (inString) str += '"';
  // Strip dangling trailing commas before we close.
  str = str.replace(/,\s*$/g, "");
  while (openBrackets-- > 0) str += "]";
  while (openBraces-- > 0) str += "}";

  // Remove `, }` or `, ]` sequences that may have been introduced.
  str = str.replace(/,(\s*[}\]])/g, "$1");
  return str;
}

/**
 * Last-resort key-by-key extractor: even with malformed JSON we can
 * usually pluck "key": "value" pairs (incl. multi-line escaped strings)
 * via a tolerant regex. We DO NOT eval — we just lift raw substrings.
 */
function lenientKeyExtract(raw: string, key: string): string | null {
  // Match "key": "...." with support for escaped quotes inside the value.
  const re = new RegExp(
    `"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    "s",
  );
  const m = raw.match(re);
  if (!m) return null;
  try {
    // Round-trip through JSON.parse to decode \n, \", etc.
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
}

function lenientHomework(raw: string): LessonJson["homework"] | undefined {
  const titleMatch = raw.match(/"homework"\s*:\s*\{[\s\S]*?"title"\s*:\s*"([^"]*)"/);
  if (!titleMatch) return undefined;
  const instr = raw.match(
    /"homework"\s*:\s*\{[\s\S]*?"instructions"\s*:\s*\[([\s\S]*?)\]/,
  );
  const time = raw.match(
    /"homework"\s*:\s*\{[\s\S]*?"estimated_time_minutes"\s*:\s*(\d+)/,
  );
  const bring = raw.match(
    /"homework"\s*:\s*\{[\s\S]*?"bring_to_class"\s*:\s*"([^"]*)"/,
  );
  const instructions = instr
    ? Array.from(instr[1].matchAll(/"((?:\\.|[^"\\])*)"/g)).map((m) => {
        try {
          return JSON.parse(`"${m[1]}"`) as string;
        } catch {
          return m[1];
        }
      })
    : ["Review today's lesson.", "Complete one short written task.", "Bring your notebook tomorrow."];
  return {
    title: titleMatch[1] || "Homework",
    instructions,
    estimated_time_minutes: time ? Number(time[1]) : 15,
    bring_to_class: bring ? bring[1] : "Completed notebook work",
  };
}

const FALLBACK_PARENT_CARD =
  "Aaj bachay ne class mein naya concept seekha. Ghar par 10 minute baith kar us se poochain ke is sabaq ka sab se aham nukta kya tha. Ek chhota ghar ka mashq mil kar kijiye aur bachay ko boliye ke woh apni soch zuban se samjhaye. Sawaal 1: Aaj tum ne kaunsi nayi baat seekhi? Sawaal 2: Is ko apni zindagi ki misaal se samjhao. Sawaal 3: Agar kal dost ko samjhana ho to kaise samjhao ge?";

export function parseLessonJson(raw: string): LessonJson {
  if (!raw || typeof raw !== "string") {
    return makeFallback("(Empty model response.)");
  }

  // 1) Pre-clean: strip markdown fences, zero-width chars, BOM, smart quotes
  //    around the JSON envelope (but NOT inside strings — we leave smart
  //    quotes there because they're already escaped if present).
  let text = raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B\u200C\u200D\u2060]/g, "")
    .trim();

  // Strip ```json ... ``` fences if present (multiple variants).
  text = text
    .replace(/^```(?:json|JSON)?\s*\n?/, "")
    .replace(/```\s*$/, "")
    .trim();

  // 2) Aggressive envelope extraction — first `{` to last `}`.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  let candidate =
    firstBrace !== -1 && lastBrace > firstBrace
      ? text.slice(firstBrace, lastBrace + 1)
      : text;

  // 3) Try strict parse on the candidate as-is.
  const tryParse = (input: string): LessonJson | null => {
    try {
      const data = JSON.parse(input) as Partial<LessonJson>;
      if (
        typeof data.teacher_guide === "string" &&
        typeof data.student_handbook === "string" &&
        typeof data.class_activity === "string" &&
        data.quiz &&
        typeof data.quiz.questions === "string"
      ) {
        return normalizeLesson(data);
      }
      return null;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(candidate);

  // 4) If that failed, try repaired version.
  if (!parsed) {
    const repaired = repairTruncatedJson(candidate);
    parsed = tryParse(repaired);
  }

  if (parsed) return parsed;

  // 5) Last resort: lenient key-by-key extraction so the UI tabs still
  //    receive readable text instead of a raw JSON dump.
  const teacher = lenientKeyExtract(candidate, "teacher_guide");
  const student = lenientKeyExtract(candidate, "student_handbook");
  const activity = lenientKeyExtract(candidate, "class_activity");
  const quizQs = lenientKeyExtract(candidate, "questions");
  const answerKey = lenientKeyExtract(candidate, "answer_key");
  const parentCard = lenientKeyExtract(candidate, "parent_engagement_card");
  const homework = lenientHomework(candidate);

  // If we got even one tab back, treat it as a partial success and fill
  // missing fields with sensible placeholders rather than crashing.
  if (teacher || student || activity || quizQs) {
    return {
      teacher_guide: teacher ?? "(Truncated — re-generate the lesson.)",
      student_handbook: student ?? "(Truncated — re-generate the lesson.)",
      class_activity: activity ?? "(Truncated — re-generate the lesson.)",
      quiz: {
        questions: quizQs ?? "(Truncated — re-generate the lesson.)",
        answer_key: answerKey ?? "(no answer key returned)",
      },
      homework:
        homework ?? {
          title: "Homework",
          instructions: [
            "Review today's lesson.",
            "Complete one short written task.",
            "Bring your notebook tomorrow.",
          ],
          estimated_time_minutes: 15,
          bring_to_class: "Completed notebook work",
        },
      parent_engagement_card: parentCard ?? FALLBACK_PARENT_CARD,
      _fallback: true,
    };
  }

  // 6) Pure failure: surface a non-JSON dump as a single tab so nothing
  //    explodes, and mark `_fallback` so the UI can show a banner.
  return makeFallback(raw);
}

function normalizeLesson(data: Partial<LessonJson>): LessonJson {
  return {
    teacher_guide: data.teacher_guide as string,
    student_handbook: data.student_handbook as string,
    class_activity: data.class_activity as string,
    quiz: {
      questions: data.quiz!.questions,
      answer_key: data.quiz!.answer_key ?? "(no answer key returned)",
    },
    homework:
      data.homework ?? {
        title: "Homework",
        instructions: [
          "Review today's lesson.",
          "Complete one short written task.",
          "Bring your notebook tomorrow.",
        ],
        estimated_time_minutes: 15,
        bring_to_class: "Completed notebook work",
      },
    parent_engagement_card:
      data.parent_engagement_card ?? FALLBACK_PARENT_CARD,
  };
}

function makeFallback(raw: string): LessonJson {
  const safe = raw.length > 4000 ? raw.slice(0, 4000) + "\n\n…(truncated)" : raw;
  return {
    teacher_guide: safe,
    student_handbook: safe,
    class_activity: safe,
    quiz: {
      questions: safe,
      answer_key:
        "(JSON parsing failed — please regenerate the lesson.)",
    },
    homework: {
      title: "Homework",
      instructions: [
        "Review the lesson.",
        "Answer two short questions.",
        "Bring your work tomorrow.",
      ],
      estimated_time_minutes: 15,
      bring_to_class: "Written homework",
    },
    parent_engagement_card:
      "Aaj ghar par bachay se sabaq ke baare mein baat karein aur us ko apne alfaaz mein samjhane dein.",
    _fallback: true,
  };
}
