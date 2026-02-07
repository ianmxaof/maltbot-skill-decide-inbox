/**
 * Moltbook executor adapter. Forwards heartbeat, execute, and pending
 * to the existing /api/moltbook/heartbeat, /api/decide/execute, and /api/moltbook/pending.
 * Uses baseUrl (e.g. process.env.NEXT_PUBLIC_APP_URL) for server-side self-calls.
 */

import type {
  ExecutorAdapter,
  ExecutorHeartbeatOptions,
  ExecutorHeartbeatResult,
  ExecutorExecuteOptions,
  ExecutorExecuteResult,
  ExecutorPendingResult,
} from "./types";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";
}

export class MoltbookAdapter implements ExecutorAdapter {
  readonly name = "moltbook";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getBaseUrl();
    if (!this.baseUrl.startsWith("http")) {
      this.baseUrl = `https://${this.baseUrl}`;
    }
  }

  async heartbeat(options?: ExecutorHeartbeatOptions): Promise<ExecutorHeartbeatResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/moltbook/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: options?.mode ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error ?? `HTTP ${res.status}`,
        };
      }
      return {
        success: true,
        skipped: data.skipped ?? data.result?.skipped,
        reason: data.reason ?? data.result?.reason,
        result: data.result,
        stats: data.stats,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Heartbeat failed",
      };
    }
  }

  async execute(options: ExecutorExecuteOptions): Promise<ExecutorExecuteResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/decide/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: options.id,
          approvedBy: options.approvedBy ?? "executor",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error ?? `HTTP ${res.status}`,
        };
      }
      return {
        success: data.success === true,
        error: data.error,
        message: data.message,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Execute failed",
      };
    }
  }

  async listPending(): Promise<ExecutorPendingResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/moltbook/pending`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          items: [],
          error: data.error ?? `HTTP ${res.status}`,
        };
      }
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        success: true,
        items: items.map((item: { id: string; category?: string; title?: string; [k: string]: unknown }) => ({
          id: item.id,
          category: item.category ?? "social",
          title: item.title ?? "",
          ...item,
        })),
      };
    } catch (err) {
      return {
        success: false,
        items: [],
        error: err instanceof Error ? err.message : "List pending failed",
      };
    }
  }
}
