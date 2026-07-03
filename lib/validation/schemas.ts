/**
 * lib/validation/schemas.ts
 *
 * Zod schemas for API request bodies. Centralized so both the route
 * handler and the rate limiter can share the same validation.
 */

import { z } from "zod";

export const GenerateLessonInput = z.object({
  school: z.string().min(1).max(200),
  district: z.string().min(1).max(100),
  classNum: z.number().int().min(1).max(12),
  subject: z.string().min(1).max(100),
  chapter: z.string().min(1).max(200),
  topic: z.string().max(200).optional().default(""),
  language: z.enum(["English", "Roman Urdu", "Pure Urdu (Script)"]),
  profile: z.enum([
    "Standard",
    "Weak Class (Below Average)",
    "Strong Class (Above Average)",
  ]),
  extra: z.string().max(2000).optional().default(""),
  topicsList: z.array(z.string().max(200)).optional().default([]),
  urduTranslate: z.boolean().optional().default(false),
  lowResource: z.boolean().optional().default(false),
  inventory: z.array(z.string().max(100)).optional().default([]),
  multiGrade: z
    .object({
      enabled: z.boolean(),
      belowGrade: z.number().int().min(1).max(12),
      atGrade: z.number().int().min(1).max(12),
      aboveGrade: z.number().int().min(1).max(12),
    })
    .optional(),
});

export type GenerateLessonInputT = z.infer<typeof GenerateLessonInput>;

export const AnalogyVoteInput = z.object({
  district: z.string().min(1).max(100),
  classNum: z.number().int().min(1).max(12).optional().nullable(),
  subject: z.string().max(100).optional().nullable(),
  section: z.string().min(1).max(40),
  snippet: z.string().min(8).max(1200),
});

export type AnalogyVoteInputT = z.infer<typeof AnalogyVoteInput>;
