/**
 * PowerCoreExecutor: single abstraction for execution (heartbeat, execute, pending).
 * Registers adapters (e.g. Moltbook); routes requests to the default or specified adapter.
 * Dashboard and cron call /api/executor/*; later OpenClaw MCP can replace the Moltbook adapter.
 */

import type { ExecutorAdapter, ExecutorHeartbeatOptions, ExecutorHeartbeatResult, ExecutorExecuteOptions, ExecutorExecuteResult, ExecutorPendingResult } from "./adapters/types";
import { MoltbookAdapter } from "./adapters/moltbook-adapter";

const adapters = new Map<string, ExecutorAdapter>();
let defaultAdapterName: string = "moltbook";

function registerDefault(): void {
  if (!adapters.has("moltbook")) {
    adapters.set("moltbook", new MoltbookAdapter());
  }
  if (!defaultAdapterName || !adapters.has(defaultAdapterName)) {
    defaultAdapterName = "moltbook";
  }
}

export function registerAdapter(adapter: ExecutorAdapter): void {
  adapters.set(adapter.name, adapter);
  if (!defaultAdapterName) defaultAdapterName = adapter.name;
}

export function setDefaultAdapter(name: string): void {
  if (adapters.has(name)) defaultAdapterName = name;
}

export function getAdapter(name?: string): ExecutorAdapter | null {
  registerDefault();
  const key = name?.trim() || defaultAdapterName;
  return adapters.get(key) ?? null;
}

export async function runHeartbeat(options?: ExecutorHeartbeatOptions): Promise<ExecutorHeartbeatResult> {
  const adapter = getAdapter(options?.adapter);
  if (!adapter) {
    return { success: false, error: "No executor adapter (e.g. moltbook) configured" };
  }
  return adapter.heartbeat(options);
}

export async function runExecute(options: ExecutorExecuteOptions): Promise<ExecutorExecuteResult> {
  const adapter = getAdapter(options.adapter);
  if (!adapter) {
    return { success: false, error: "No executor adapter configured" };
  }
  return adapter.execute(options);
}

export async function listPending(adapterName?: string): Promise<ExecutorPendingResult> {
  const adapter = getAdapter(adapterName);
  if (!adapter) {
    return { success: false, items: [], error: "No executor adapter configured" };
  }
  return adapter.listPending();
}

export type { ExecutorAdapter, ExecutorHeartbeatOptions, ExecutorHeartbeatResult, ExecutorExecuteOptions, ExecutorExecuteResult, ExecutorPendingResult } from "./adapters/types";
