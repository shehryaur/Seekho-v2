/**
 * lib/inngest/functions.ts
 *
 * Background job definitions for Seekho Engine. Currently defines a single
 * "lesson.generate" job that runs the same pipeline as the sync API but
 * in the background. Useful for batch generation or very slow models.
 *
 * If you're not using Inngest yet, this file is safe to have. It won't
 * execute unless you send the "seekho/lesson.generate" event.
 */

import { inngest } from "./client";
import { createServiceClient } from "@/lib/auth/supabase-server";
import { logger } from "@/lib/logger";
import {
  getDistrict,
  getTopVerifiedSnippets,
  saveLesson,
  logAnalytics,
} from "@/lib/supabase";
import {
  generateLessonPipeline,
} from "@/lib/lessonPipeline";

type GenerateInput = {
  userId: string;
  school: string;
  district: string;
  classNum: number;
  subject: string;
  chapter: string;
  topic?: string;
  language: "English" | "Roman Urdu" | "Pure Urdu (Script)";
  profile: "Standard" | "Weak Class (Below Average)" | "Strong Class (Above Average)";
  extra?: string;
  topicsList?: string[];
  urduTranslate?: boolean;
  lowResource?: boolean;
  inventory?: string[];
};

export const generateLessonJob = inngest.createFunction(
  {
    id: "generate-lesson",
    name: "Generate Lesson (background)",
    triggers: [{ event: "seekho/lesson.generate" }]
  },
  async ({ event, step }) => {
    const input = event.data as GenerateInput;

    const district = await step.run("fetch-district", async () => {
      return await getDistrict(input.district);
    });

    const verifiedContext = await step.run("fetch-verified", async () => {
      return await getTopVerifiedSnippets({
        district: input.district,
        classNum: input.classNum,
        subject: input.subject,
        limit: 6,
      });
    });

    const { lesson, health } = await step.run("run-pipeline", async () => {
      return await generateLessonPipeline({
        school: input.school,
        district,
        classNum: input.classNum,
        subject: input.subject,
        chapter: input.chapter,
        topic: input.topic ?? "",
        language: input.language,
        profile: input.profile,
        extra: input.extra ?? "",
        topicsList: input.topicsList ?? [],
        urduTranslate: input.urduTranslate ?? false,
        lowResource: input.lowResource ?? false,
        inventory: input.inventory ?? [],
        multiGrade: undefined,
        verifiedContext,
      });
    });

    const saved = await step.run("save-lesson", async () => {
      return await saveLesson({
        user_id: input.userId,
        school_name: input.school,
        district: input.district,
        class_num: input.classNum,
        subject: input.subject,
        chapter: input.chapter,
        topic: input.topic || "Full Chapter Overview",
        language: input.language,
        output_mode: "Full Lesson Pack",
        class_profile: input.profile,
        content: JSON.stringify(lesson),
        inventory: input.inventory ?? [],
        homework_json: lesson.homework ?? null,
        parent_engagement_card: lesson.parent_engagement_card ?? null,
        parent_card_generated: Boolean(lesson.parent_engagement_card),
      });
    });

    await step.run("log-analytics", async () => {
      await logAnalytics({
        user_id: input.userId,
        district: input.district,
        class_num: input.classNum,
        subject: input.subject,
        chapter: input.chapter,
        language: input.language,
        output_mode: "Full Lesson Pack",
        verified_context_count: verifiedContext.length,
      });
    });

    logger.info("background lesson generated", { userId: input.userId, shareToken: saved?.share_token ?? null });

    return { shareToken: saved?.share_token, health };
  },
);

export const allFunctions = [generateLessonJob];