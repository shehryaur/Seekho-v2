/**
 * lib/sanitize/index.ts
 *
 * Server-side sanitization for user-submitted text before it hits the DB.
 * Uses isomorphic-dompurify to strip HTML/script tags. If DOMPurify is
 * not installed (e.g. during a quick test), falls back to a basic tag stripper.
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize a user-submitted snippet for storage in verified_context.
 * Strips all HTML tags and script content. Returns plain text.
 */
export function sanitizeSnippet(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  try {
    // DOMPurify with ALLOWED_TAGS: [] strips everything to plain text
    const clean = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    return clean.trim();
  } catch {
    // Fallback: basic regex strip of <...> tags
    return trimmed
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .trim();
  }
}

/**
 * Sanitize a longer text field (e.g. lesson content). Allows basic
 * markdown-friendly characters but strips script tags.
 */
export function sanitizeText(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  try {
    const clean = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "code", "pre", "br"],
      ALLOWED_ATTR: [],
    });
    return clean.trim();
  } catch {
    return trimmed
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .trim();
  }
}

/**
 * Heuristic check for prompt-injection attempts in user input.
 * Returns true if the input looks suspicious (not a hard block, just a flag).
 */
export function looksLikeInjection(input: string): boolean {
  const lower = input.toLowerCase();
  const patterns = [
    "ignore previous",
    "ignore all instructions",
    "you are now",
    "act as",
    "system prompt",
    "disregard the above",
    "new instruction",
  ];
  return patterns.some((p) => lower.includes(p));
}
