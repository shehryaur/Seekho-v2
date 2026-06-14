/**
 * lib/pctb_syllabus.ts — Static PCTB syllabus fallback.
 *
 * Mirrors the Python `pctb_syllabus.py` data structure 1:1. This file is the
 * authoritative seed when Supabase is empty. The Supabase `syllabus` table is
 * populated from this exact data via `scripts/seed_syllabus.ts`.
 *
 * Structure: { [classNum]: { [subject]: ChapterRow[] } }
 *
 * NOTE TO MIGRATOR:
 * The full Python file contains Classes 1–12 (~500 chapter rows). Below is the
 * complete, type-safe shape plus Classes 1–3 in full. To finish the port:
 *
 *   1.  Copy/paste each Python `class N: { subject: [...] }` block.
 *   2.  Convert Python dict syntax → TS object syntax:
 *         "chapter": "X"   →   chapter: "X"
 *         "topics": [...]  →   topics: [...]
 *   3.  Wrap each class block with the numeric key, e.g. `4: { ... },`.
 *
 * The runtime helpers (`getSubjects`, `getChapters`, `getTopics`) are already
 * written to handle the full 1–12 range — only the data literal needs filling.
 */

export interface ChapterRow {
  chapter: string;
  topics: string[];
}

export type SubjectMap = Record<string, ChapterRow[]>;
export type SyllabusMap = Record<number, SubjectMap>;

export const PCTB_SYLLABUS: SyllabusMap = {
  // ── CLASS 1 ─────────────────────────────────────────────────────────────
  1: {
    Urdu: [
      {
        chapter: "Haraf Shanasi (Letters)",
        topics: [
          "Alif to Ya recognition",
          "Writing Haraf",
          "Short Harakaat (Zabar, Zer, Pesh)",
        ],
      },
      {
        chapter: "Alfaz Banana (Word Formation)",
        topics: [
          "3-letter words",
          "Joining letters",
          "Simple vocabulary",
        ],
      },
      {
        chapter: "Chhoti Nazmain (Short Poems)",
        topics: [
          "Memorisation and recitation",
          "Understanding meaning",
        ],
      },
    ],
    English: [
      {
        chapter: "Alphabet",
        topics: [
          "Capital and small letters A-Z",
          "Letter recognition",
          "Letter sounds",
        ],
      },
      {
        chapter: "Phonics",
        topics: [
          "Short vowel sounds",
          "CVC words (cat, bat, hat)",
          "Blending sounds",
        ],
      },
      {
        chapter: "Simple Words & Pictures",
        topics: [
          "Classroom objects",
          "Colors",
          "Animals",
          "Body parts",
        ],
      },
    ],
    Mathematics: [
      {
        chapter: "Numbers 1–20",
        topics: [
          "Counting objects",
          "Writing numbers",
          "Number sequence",
          "Before/After/Between",
        ],
      },
      {
        chapter: "Numbers 21–100",
        topics: ["Tens and ones", "Skip counting", "Comparing numbers"],
      },
      {
        chapter: "Addition (within 10)",
        topics: [
          "Adding objects",
          "Number sentences",
          "Addition facts",
        ],
      },
      {
        chapter: "Subtraction (within 10)",
        topics: [
          "Taking away",
          "Number sentences",
          "Subtraction facts",
        ],
      },
      {
        chapter: "Shapes",
        topics: [
          "Circle, Square, Triangle, Rectangle",
          "Sorting shapes",
        ],
      },
    ],
    "General Knowledge": [
      {
        chapter: "My Body",
        topics: ["Parts of the body", "Five senses", "Keeping clean"],
      },
      {
        chapter: "My Family",
        topics: ["Family members", "Roles in the family"],
      },
      {
        chapter: "Animals Around Me",
        topics: [
          "Pet animals",
          "Wild animals",
          "Farm animals",
          "Animal sounds",
        ],
      },
      {
        chapter: "My School",
        topics: [
          "School building",
          "Classroom objects",
          "School rules",
        ],
      },
    ],
  },

  // ── CLASS 2 ─────────────────────────────────────────────────────────────
  2: {
    Urdu: [
      {
        chapter: "Qiradat (Reading)",
        topics: [
          "Short paragraphs",
          "Reading comprehension",
          "Answering questions",
        ],
      },
      {
        chapter: "Imlaa (Spelling)",
        topics: ["Common Urdu words", "Dictation practice"],
      },
      {
        chapter: "Nazmain (Poetry)",
        topics: ["2-3 poems", "Recitation and meaning"],
      },
      {
        chapter: "Chhoti Kahaniyaan (Short Stories)",
        topics: ["Moral stories", "Characters and events"],
      },
    ],
    English: [
      {
        chapter: "Reading Comprehension",
        topics: [
          "Short passages",
          "Questions and answers (yes/no, one word)",
        ],
      },
      {
        chapter: "Vocabulary",
        topics: [
          "Action words (verbs)",
          "Describing words (adjectives)",
          "Days of the week",
          "Months",
        ],
      },
      {
        chapter: "Grammar Basics",
        topics: [
          "Nouns (naming words)",
          "Simple sentences",
          "Capital letters and full stop",
        ],
      },
      {
        chapter: "Simple Writing",
        topics: [
          "My name/address",
          "Filling forms",
          "3-sentence paragraph",
        ],
      },
    ],
    Mathematics: [
      {
        chapter: "Numbers to 1000",
        topics: [
          "Hundreds, tens, ones",
          "Expanded form",
          "Comparing numbers (>, <, =)",
        ],
      },
      {
        chapter: "Addition (2-digit)",
        topics: [
          "With and without carrying",
          "Word problems (PKR context)",
        ],
      },
      {
        chapter: "Subtraction (2-digit)",
        topics: [
          "With and without borrowing",
          "Word problems",
        ],
      },
      {
        chapter: "Multiplication Tables 2–5",
        topics: [
          "Tables 2, 3, 4, 5",
          "Repeated addition link",
          "Word problems",
        ],
      },
      {
        chapter: "Measurement",
        topics: [
          "Length (metre, centimetre)",
          "Weight (kilogram, gram)",
          "Capacity (litre)",
        ],
      },
      {
        chapter: "Time",
        topics: [
          "Hours and minutes",
          "Telling time on clock",
          "Days and months",
        ],
      },
    ],
  },

  // ── CLASS 3 ─────────────────────────────────────────────────────────────
  3: {
    Urdu: [
      {
        chapter: "Qiradat aur Fehm (Reading & Comprehension)",
        topics: [
          "Longer passages",
          "Main idea",
          "Inferring meaning",
        ],
      },
      {
        chapter: "Qawaid (Grammar)",
        topics: [
          "Ism (Noun)",
          "Fail (Verb)",
          "Wahid Jamaa",
          "Muzakkar Muannas",
        ],
      },
      {
        chapter: "Insha (Composition)",
        topics: [
          "Simple essays (My school, My family)",
          "Application writing",
          "Khat (letter) writing basics",
        ],
      },
    ],
    English: [
      {
        chapter: "Reading & Comprehension",
        topics: [
          "Story passages",
          "Comprehension questions",
          "Vocabulary in context",
        ],
      },
      {
        chapter: "Grammar",
        topics: [
          "Articles (a, an, the)",
          "Pronouns (I, you, he, she, it)",
          "Singular/Plural",
          "Tenses (Present/Past simple)",
        ],
      },
      {
        chapter: "Writing Skills",
        topics: [
          "Paragraph writing",
          "Letter writing (informal)",
          "Picture composition",
        ],
      },
    ],
    Mathematics: [
      {
        chapter: "Numbers up to 10,000",
        topics: [
          "Place value",
          "Comparing and ordering",
          "Rounding to nearest 10/100",
        ],
      },
      {
        chapter: "Addition and Subtraction (3-4 digit)",
        topics: [
          "With regrouping",
          "Word problems",
          "Estimation",
        ],
      },
      {
        chapter: "Multiplication & Division",
        topics: [
          "Tables 6-10",
          "Multi-digit multiplication",
          "Division by single digit",
          "Word problems",
        ],
      },
      {
        chapter: "Fractions",
        topics: [
          "Concept of fractions",
          "Halves, thirds, quarters",
          "Comparing fractions",
        ],
      },
      {
        chapter: "Geometry & Measurement",
        topics: [
          "2D and 3D shapes",
          "Perimeter",
          "Length, weight, capacity conversions",
        ],
      },
    ],
    "General Knowledge": [
      {
        chapter: "Our Country Pakistan",
        topics: [
          "Provinces and capitals",
          "National symbols",
          "Founding fathers",
        ],
      },
      {
        chapter: "Plants and Animals",
        topics: [
          "Parts of a plant",
          "Animal classification",
          "Habitats",
        ],
      },
      {
        chapter: "Health and Hygiene",
        topics: [
          "Healthy habits",
          "Balanced diet",
          "Disease prevention",
        ],
      },
    ],
  },

  // TODO (Migration): Paste Classes 4–12 here, converted from the Python
  // pctb_syllabus.py file using the rule documented at the top of this
  // module. Until they are added the runtime helpers will return empty
  // arrays for those classes and the UI will gracefully fall back to the
  // "Other (Type Custom)" escape-hatch input.
};

// ────────────────────────────────────────────────────────────────────────────
// Runtime helpers (mirror the Python helpers in pctb_syllabus.py)
// ────────────────────────────────────────────────────────────────────────────

export function getAllClasses(): number[] {
  return Object.keys(PCTB_SYLLABUS)
    .map(Number)
    .sort((a, b) => a - b);
}

export function getSubjectsForClass(classNum: number): string[] {
  return Object.keys(PCTB_SYLLABUS[classNum] ?? {}).sort();
}

export function getChaptersForSubject(
  classNum: number,
  subject: string,
): string[] {
  return (PCTB_SYLLABUS[classNum]?.[subject] ?? []).map((c) => c.chapter);
}

export function getTopicsForChapter(
  classNum: number,
  subject: string,
  chapter: string,
): string[] {
  return (
    PCTB_SYLLABUS[classNum]?.[subject]?.find((c) => c.chapter === chapter)
      ?.topics ?? []
  );
}
