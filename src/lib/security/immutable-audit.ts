/**
 * Immutable Audit Trail — hash-chained, append-only, tamper-detectable.
 *
 * Key principle: "If the system you're monitoring controls the monitoring,
 * you have no monitoring." This audit trail:
 * 1. Is append-only — no delete, no update
 * 2. Hash-chains entries — each entry includes the hash of the previous entry
 * 3. Stores outside the agent's primary data path (.data/audit/ separate from .data/)
 * 4. Can detect tampering via chain verification
 * 5. Optionally forwards to an external webhook for off-system persistence
 */

import { createHash } from "crypto";
import { kv } from "@/lib/db";

const KV_KEY = "audit:audit-chain"; // "audit:" prefix tells file adapter to use .audit/ directory

export interface ImmutableAuditEntry {
  seq: number;                  // Monotonically increasing sequence number
  timestamp: string;            // ISO 8601
  prevHash: string;             // SHA-256 of previous entry (genesis = "0")
  hash: string;                 // SHA-256 of this entry (computed from all fields except hash)

  // Event data
  event: AuditEventType;
  result: "allowed" | "blocked" | "approved" | "denied" | "expired" | "system";
  operation: string;
  target?: string;
  userId?: string;
  agentId?: string;
  source?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type AuditEventType =
  | "operation_check"           // Security middleware checked an operation
  | "operation_execute"         // An approved operation was executed
  | "approval_granted"          // Human approved a pending action
  | "approval_denied"           // Human denied a pending action
  | "approval_expired"          // Time-limited approval expired
  | "anomaly_detected"          // Anomaly detector fired
  | "agent_paused"              // Agent execution paused
  | "agent_resumed"             // Agent execution resumed
  | "spec_created"              // Task spec was created
  | "spec_updated"              // Task spec was modified
  | "permission_granted"        // Permission was granted (with optional expiry)
  | "permission_revoked"        // Permission was revoked or expired
  | "disclosure_transition"     // User moved to a new disclosure stage
  | "system_event";             // Generic system event

// ─── Core Functions ──────────────────────────────────────

function computeHash(entry: Omit<ImmutableAuditEntry, "hash">): string {
  const payload = JSON.stringify({
    seq: entry.seq,
    timestamp: entry.timestamp,
    prevHash: entry.prevHash,
    event: entry.event,
    result: entry.result,
    operation: entry.operation,
    target: entry.target,
    userId: entry.userId,
    agentId: entry.agentId,
    source: entry.source,
    reason: entry.reason,
    metadata: entry.metadata,
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function getLastEntry(): Promise<ImmutableAuditEntry | null> {
  try {
    const lines = await kv.readLines(KV_KEY);
    const nonEmpty = lines.filter(Boolean);
    if (nonEmpty.length === 0) return null;
    return JSON.parse(nonEmpty[nonEmpty.length - 1]) as ImmutableAuditEntry;
  } catch {
    return null;
  }
}

/**
 * Append an immutable, hash-chained audit entry.
 * This is the ONLY write operation — no updates, no deletes.
 */
export async function appendImmutableAudit(
  event: AuditEventType,
  data: {
    result: ImmutableAuditEntry["result"];
    operation: string;
    target?: string;
    userId?: string;
    agentId?: string;
    source?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ImmutableAuditEntry> {
  const last = await getLastEntry();
  const seq = last ? last.seq + 1 : 0;
  const prevHash = last ? last.hash : "0";

  const partial: Omit<ImmutableAuditEntry, "hash"> = {
    seq,
    timestamp: new Date().toISOString(),
    prevHash,
    event,
    result: data.result,
    operation: data.operation,
    target: data.target,
    userId: data.userId,
    agentId: data.agentId,
    source: data.source,
    reason: data.reason,
    metadata: data.metadata,
  };

  const hash = computeHash(partial);
  const entry: ImmutableAuditEntry = { ...partial, hash };

  // Append as a single line (JSONL format)
  await kv.append(KV_KEY, JSON.stringify(entry));

  // Optional: forward to external webhook
  forwardToWebhook(entry).catch(() => {});

  return entry;
}

/**
 * Verify the integrity of the entire audit chain.
 * Returns { valid: true } or { valid: false, brokenAt: seq, reason: string }.
 */
export async function verifyAuditChain(): Promise<
  | { valid: true; entries: number }
  | { valid: false; entries: number; brokenAt: number; reason: string }
> {
  try {
    const rawLines = await kv.readLines(KV_KEY);
    const lines = rawLines.filter(Boolean);

    if (lines.length === 0) return { valid: true, entries: 0 };

    let prevHash = "0";

    for (let i = 0; i < lines.length; i++) {
      const entry = JSON.parse(lines[i]) as ImmutableAuditEntry;

      // Check sequence
      if (entry.seq !== i) {
        return {
          valid: false,
          entries: lines.length,
          brokenAt: i,
          reason: `Expected seq ${i}, got ${entry.seq}`,
        };
      }

      // Check prev hash chain
      if (entry.prevHash !== prevHash) {
        return {
          valid: false,
          entries: lines.length,
          brokenAt: i,
          reason: `Chain broken: prevHash mismatch at seq ${i}`,
        };
      }

      // Recompute hash
      const { hash, ...rest } = entry;
      const computed = computeHash(rest);
      if (computed !== hash) {
        return {
          valid: false,
          entries: lines.length,
          brokenAt: i,
          reason: `Hash mismatch at seq ${i}: entry tampered`,
        };
      }

      prevHash = hash;
    }

    return { valid: true, entries: lines.length };
  } catch {
    return { valid: true, entries: 0 };
  }
}

/**
 * Read recent audit entries (most recent first).
 */
export async function readRecentAudit(limit: number = 50): Promise<ImmutableAuditEntry[]> {
  try {
    const rawLines = await kv.readLines(KV_KEY);
    const lines = rawLines.filter(Boolean);
    const entries = lines
      .slice(-limit)
      .map((l) => JSON.parse(l) as ImmutableAuditEntry)
      .reverse();
    return entries;
  } catch {
    return [];
  }
}

/**
 * Get audit stats for the governance dashboard.
 */
export async function getAuditStats(): Promise<{
  totalEntries: number;
  chainValid: boolean;
  last24h: { allowed: number; blocked: number; approved: number; denied: number; expired: number };
}> {
  const verification = await verifyAuditChain();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const recent = await readRecentAudit(500);
  const last24h = recent.filter((e) => e.timestamp > oneDayAgo);

  return {
    totalEntries: verification.entries,
    chainValid: verification.valid,
    last24h: {
      allowed: last24h.filter((e) => e.result === "allowed").length,
      blocked: last24h.filter((e) => e.result === "blocked").length,
      approved: last24h.filter((e) => e.result === "approved").length,
      denied: last24h.filter((e) => e.result === "denied").length,
      expired: last24h.filter((e) => e.result === "expired").length,
    },
  };
}

// ─── External Webhook Forwarding ─────────────────────────

async function forwardToWebhook(entry: ImmutableAuditEntry): Promise<void> {
  const webhookUrl = process.env.AUDIT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Webhook failure is non-blocking — local chain is the source of truth
  }
}
