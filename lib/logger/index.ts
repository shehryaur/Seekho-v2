/**
 * lib/logger/index.ts
 *
 * Minimal structured logger. Uses console in dev, pino in production if
 * installed. If pino is not installed, falls back to console.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ userId, ms }, "lesson generated");
 *   logger.warn({ err }, "db write failed");
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "info";

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel) {
  return levels[level] >= levels[currentLevel];
}

function format(level: LogLevel, msg: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    return `${ts} [${level.toUpperCase()}] ${msg} ${JSON.stringify(data)}`;
  }
  return `${ts} [${level.toUpperCase()}] ${msg}`;
}

export const logger = {
  debug(msg: string, data?: unknown) {
    if (shouldLog("debug")) console.debug(format("debug", msg, data));
  },
  info(msg: string, data?: unknown) {
    if (shouldLog("info")) console.info(format("info", msg, data));
  },
  warn(msg: string, data?: unknown) {
    if (shouldLog("warn")) console.warn(format("warn", msg, data));
  },
  error(msg: string, data?: unknown) {
    if (shouldLog("error")) console.error(format("error", msg, data));
  },
};
