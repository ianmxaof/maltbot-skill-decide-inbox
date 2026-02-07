/**
 * Persisted activity log for learning loop, trust scoring, and reports.
 * Append-only JSONL; query by time window and type.
 * Typed entries enable reliable pattern detection in suggestGuardrails.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

const DEFAULT_DATA_DIR = ".data";
const DEFAULT_FILENAME = "activity-log.jsonl";

export class ActivityStore {
  private filePath: string;
  private buffer: TypedActivityEntry[] = [];
  private maxBufferSize = 500;
  private flushScheduled = false;

  constructor(options?: { dataDir?: string; filename?: string }) {
    const dataDir = options?.dataDir ?? path.join(process.cwd(), DEFAULT_DATA_DIR);
    const filename = options?.filename ?? DEFAULT_FILENAME;
    this.filePath = path.join(dataDir, filename);
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

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
        this.flush().catch(() => {});
      });
    }
  }

  /**
   * Flush buffer to disk (append to JSONL).
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    await this.ensureDir();
    const lines = this.buffer.splice(0, this.buffer.length).map((e) => JSON.stringify(e)).join("\n") + "\n";
    await writeFile(this.filePath, lines, { flag: "a", encoding: "utf-8" });
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
    if (!existsSync(this.filePath)) return results;

    const content = await readFile(this.filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
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

export function getActivityStore(options?: ConstructorParameters<typeof ActivityStore>[0]): ActivityStore {
  if (!storeInstance) {
    storeInstance = new ActivityStore(options);
  }
  return storeInstance;
}
