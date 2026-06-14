/**
 * lib/classConfig.ts — Per-class pedagogical configuration.
 *
 * Ported 1:1 from the Python `CLASS_CFG` dictionary in seekho_v3.py.
 * Drives vocabulary, quiz format, Bloom level, length and a per-class note
 * that the prompt builder injects.
 */

export interface ClassRule {
  vocab: string;
  q: string;       // quiz format
  bl: string;      // Bloom's taxonomy level
  len: string;     // length target
  n: string;       // pedagogical note
}

export const CLASS_CFG: Record<number, ClassRule> = {
  1: {
    vocab: "3-5 word sentences. Monosyllabic words. Heavy repetition.",
    q: "True/False or circle-the-picture. Max 3 questions.",
    bl: "REMEMBER only.",
    len: "60-90 words. One concept.",
    n: "Teacher reads aloud. Writing = tracing.",
  },
  2: {
    vocab: "2-syllable words. 5-7 word sentences.",
    q: "Match column or 3-option MCQ. Max 4 questions.",
    bl: "REMEMBER + basic UNDERSTAND.",
    len: "100-140 words.",
    n: "Anchor to objects the child can hold.",
  },
  3: {
    vocab:
      "Everyday words. Max 8 words/sentence. Repeat key terms 3 times.",
    q: "3-option MCQ + 1 fill-in-blank. 5 questions.",
    bl: "REMEMBER + UNDERSTAND. Simple categorisation.",
    len: "150-200 words.",
    n: "Group oral activities work better than individual writing.",
  },
  4: {
    vocab: "Define any term inline. Max 10 words/sentence.",
    q: "3-option MCQ + match column. 5-6 questions.",
    bl: "REMEMBER, UNDERSTAND, simple APPLY.",
    len: "200-260 words.",
    n: "Drawing activities improve retention for this age.",
  },
  5: {
    vocab: "Technical terms with bracket definition. Max 12 words.",
    q: "4-option MCQ + fill-blank + 1 short answer. 6 questions.",
    bl: "REMEMBER, UNDERSTAND, APPLY.",
    len: "250-320 words.",
    n: "PCTB board pressure begins here. Past-paper vocabulary.",
  },
  6: {
    vocab:
      "Technical terms with parenthetical definition. Max 12 words.",
    q: "4-option MCQ + short answer + diagram label. 7 questions.",
    bl: "REMEMBER, UNDERSTAND, APPLY. One application question.",
    len: "300-380 words.",
    n: "BISE alignment critical. Match PCTB chapter references.",
  },
  7: {
    vocab: "Board-level vocabulary. Sentences up to 14 words.",
    q: "MCQ (4-option) + SQs (2-3 marks) + 1 reasoning question. 8 questions.",
    bl: "REMEMBER through ANALYZE. At least one analytical question.",
    len: "350-430 words.",
    n: "Pair work and written discussion appropriate.",
  },
  8: {
    vocab: "Full PCTB vocabulary. Board exam sentence structure.",
    q: "MCQ + SQ + LQ outline. 8-10 questions. Board format.",
    bl: "All levels through ANALYZE.",
    len: "400-500 words.",
    n: "Matric preparation. Formal, exam-aligned tone.",
  },
  9: {
    vocab: "Complete PCTB Matric vocabulary. Precise definitions.",
    q: "MCQ (1-mark) + SQ (2-3 mark) + LQ (5-mark). 10 questions.",
    bl: "All Bloom's levels. Analysis + evaluation required.",
    len: "450-550 words. Board exam format.",
    n: "Reference PCTB chapter explicitly. Past-paper language.",
  },
  10: {
    vocab: "Board exam vocabulary. Complex sentences acceptable.",
    q: "Full board format: MCQ + SQ + LQ. 10-12 questions.",
    bl: "All levels. CREATE + EVALUATE dominant.",
    len: "500-620 words. BISE standard.",
    n: "Board year. Every element must be exam-relevant.",
  },
  11: {
    vocab:
      "University-entrance vocabulary. FSc/FA technical language.",
    q: "HSSC SQs + LQs. Essay-type possible. 8-12 questions.",
    bl: "EVALUATE + CREATE dominant. Cross-topic synthesis.",
    len: "600+ words. HSSC standard.",
    n: "MDCAT/ECAT relevance where applicable.",
  },
  12: {
    vocab:
      "University-entrance vocabulary. Critical analysis language.",
    q: "Board SQs, LQs, numericals. 10-14 questions.",
    bl: "EVALUATE, CREATE, synthesis.",
    len: "650+ words. HSSC final year.",
    n: "Entry test preparation is the primary driver.",
  },
};

export function getClassRule(classNum: number): ClassRule {
  return CLASS_CFG[classNum] ?? CLASS_CFG[6];
}
