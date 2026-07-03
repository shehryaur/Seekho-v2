/**
 * lib/db/audit.ts
 *
 * Best-effort audit logger. Writes to the `audit_log` table via the
 * service-role client. NEVER throws — if the DB is down, the audit
 * is silently dropped so the user's request still succeeds.
 */

import { createServiceClient } from "@/lib/auth/supabase-server";

export interface AuditEntry {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function audit(entry: AuditEntry): Promise<void> {
  const client = createServiceClient();
  if (!client) return;
  try {
    await client.from("audit_log").insert({
      user_id: entry.userId,
      action: entry.action,
      resource: entry.resource ?? null,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch {
    // swallow — audit must never break the user's request
  }
}

/**
 * Extract client IP from common proxy headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
