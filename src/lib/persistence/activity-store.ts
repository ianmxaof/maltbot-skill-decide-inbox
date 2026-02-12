/**
 * Persisted activity log for learning loop, trust scoring, and reports.
 * Append-only JSONL; query by time window and type.
 * Typed entries enable reliable pattern detection in suggestGuardrails.
 */

import { kv } from "@/lib/db";
import type { AnomalyType } from "@/lib/security/anomaly-detector";
import type { Visibility } from "@/types/governance";

// Typed activity entries (discriminated union). operatorId for attribution (social layer).
export type TypedActivityEntry =
  | {
      type: "operation_blocked";
      timestamp: string; // ISO
      operation: string;
      target: string;
      reason: string;
      operatorId?: string;
      visibility?: Visibility;
    }
  | {
      type: "operation_approved";
      timestamp: string;
      operation: string;
      target: string;
      approvedBy: string;
      operatorId?: string;
      visibility?: Visibility;
    }
  | {
      type: "anomaly_detected";
      timestamp: string;
      anomalyType: AnomalyType;
      severity: string;
      operatorId?: string;
      visibility?: Visibility;
    }
  | {
      type: "rate_spike";
      timestamp: string;
      metric: string;
      value: number;
      baseline: number;
      operatorId?: string;
      visibility?: Visibility;
    };

export interface ActivityQueryOptions {
  since?: Date;
  until?: Date;
  type?: TypedActivityEntry["type"];
  operatorId?: string;
  limit?: number;
}

const KV_KEY = "activity-log.jsonl";

export class ActivityStore {
  private buffer: TypedActivityEntry[] = [];
  private maxBufferSize = 500;
  private flushScheduled = false;

  /**
   * Append a typed entry. Buffers in memory and appends to JSONL file.
   */
  async append(entry: Omit<TypedActivityEntry, "timestamp"> & { timestamp?: Date | string }): Promise<void> {
    const normalized: TypedActivityEntry = {
      ...entry,
      timestamp: typeof entry.timestamp === "string" ? entry.timestamp : (entry.timestamp ?? new Date()).toISOString(),
    } as TypedActivityEntry;
    this.buffer.push(normalized);
    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    } else if (!this.flushScheduled) {
      this.flushScheduled = true;
      setImmediate(() => {
        this.flushScheduled = false;
        this.flush().catch((e) => console.error("[activity-store] flush failed:", e));
      });
    }
  }

  /**
   * Flush buffer to disk (append to JSONL).
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const entries = this.buffer.splice(0, this.buffer.length);
    for (const e of entries) {
      await kv.append(KV_KEY, JSON.stringify(e));
    }
  }

  /**
   * Query entries by time window and optional type. Scans file (and optional in-memory buffer).
   * For large files, consider an index or SQLite later.
   */
  async query(opts: ActivityQueryOptions = {}): Promise<TypedActivityEntry[]> {
    await this.flush();
    const sinceMs = opts.since?.getTime() ?? 0;
    const untilMs = opts.until ? opts.until.getTime() : Date.now() + 86400000;
    const typeFilter = opts.type;
    const limit = opts.limit ?? 10000;

    const results: TypedActivityEntry[] = [];

    const lines = await kv.readLines(KV_KEY);
    const operatorFilter = opts.operatorId;
    for (let i = lines.length - 1; i >= 0 && results.length < limit; i--) {
      try {
        const entry = JSON.parse(lines[i]) as TypedActivityEntry;
        const ts = new Date(entry.timestamp).getTime();
        if (ts < sinceMs || ts > untilMs) continue;
        if (typeFilter && entry.type !== typeFilter) continue;
        if (operatorFilter && (entry as { operatorId?: string }).operatorId !== operatorFilter) continue;
        results.push(entry);
      } catch {
        // skip malformed lines
      }
    }
    return results;
  }
}

let storeInstance: ActivityStore | null = null;

export function getActivityStore(): ActivityStore {
  if (!storeInstance) {
    storeInstance = new ActivityStore();
  }
  return storeInstance;
}
