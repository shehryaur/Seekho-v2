import { differenceInCalendarDays, max, min } from "date-fns";

export interface ProgressEntry {
  chapter: string;
  taughtOn: string; // ISO date
}

export const ACADEMIC_CALENDAR = {
  teachingStart: "2026-04-01",
  boardExamTarget: "2027-02-15",
  academicYearLabel: "2026-2027",
};

export function getExpectedCompletionRatio(todayIso: string) {
  const start = new Date(ACADEMIC_CALENDAR.teachingStart);
  const exam = new Date(ACADEMIC_CALENDAR.boardExamTarget);
  const today = min([max([new Date(todayIso), start]), exam]);
  const elapsed = differenceInCalendarDays(today, start);
  const total = Math.max(1, differenceInCalendarDays(exam, start));
  return elapsed / total;
}

export function getVelocityStatus(entries: ProgressEntry[], totalChapters: number, todayIso: string) {
  const expectedRatio = getExpectedCompletionRatio(todayIso);
  const expectedCount = Math.max(0, Math.round(expectedRatio * totalChapters));
  const actualCount = entries.length;
  const ratio = expectedCount === 0 ? 1 : actualCount / expectedCount;
  const behindBy = Math.max(0, expectedCount - actualCount);
  return {
    expectedRatio,
    expectedCount,
    actualCount,
    ratio,
    behindBy,
    isBehind: ratio < 1,
  };
}
