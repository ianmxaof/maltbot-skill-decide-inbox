/**
 * Resolves the current operator (who did this) for attribution.
 * Single-tenant: one operator per deployment from env or .data/operator.json.
 * Use getOperatorId() wherever a "user" or "caller" is needed so data is attributable.
 */

import { kv } from "@/lib/db";

let cachedId: string | null = null;
let cachedHandle: string | null | undefined = undefined; // undefined = not loaded

async function loadOperatorFromConfig(): Promise<{ id: string; handle?: string }> {
  try {
    const data = await kv.get<{ operatorId?: string; handle?: string }>("operator");
    if (!data) return { id: "default" };
    const id = typeof data.operatorId === "string" && data.operatorId.trim() ? data.operatorId.trim() : "default";
    const handle = typeof data.handle === "string" && data.handle.trim() ? data.handle.trim() : undefined;
    return { id, handle };
  } catch {
    return { id: "default" };
  }
}

/**
 * Current operator id. Prefers OPERATOR_ID env, then operator.json, then "default".
 * Sync for use in request path; reads env only (no file read in sync path).
 */
export function getOperatorId(): string {
  if (cachedId !== null) return cachedId;
  const env = process.env.OPERATOR_ID?.trim();
  if (env) {
    cachedId = env;
    return cachedId;
  }
  return "default";
}

/**
 * Optional display handle. From OPERATOR_HANDLE env or operator.json.
 * Sync version returns undefined if only file has it (use getOperatorHandleAsync when needed).
 */
export function getOperatorHandle(): string | undefined {
  if (cachedHandle !== undefined) return cachedHandle ?? undefined;
  const env = process.env.OPERATOR_HANDLE?.trim();
  if (env) {
    cachedHandle = env;
    return env;
  }
  return undefined;
}

/**
 * Ensure operator is resolved from config (e.g. on startup or first API call).
 * Call from routes that need handle when env is not set.
 */
export async function resolveOperator(): Promise<{ id: string; handle?: string }> {
  const fromEnv = process.env.OPERATOR_ID?.trim();
  if (fromEnv) {
    cachedId = fromEnv;
    cachedHandle = process.env.OPERATOR_HANDLE?.trim() || undefined;
    return { id: cachedId, handle: cachedHandle };
  }
  const fromConfig = await loadOperatorFromConfig();
  cachedId = fromConfig.id;
  cachedHandle = fromConfig.handle ?? null;
  return { id: fromConfig.id, handle: fromConfig.handle };
}

/**
 * Call once at app init or first request to prime cache from .data/operator.json if env not set.
 */
export function setOperatorId(id: string): void {
  cachedId = id;
}

export function setOperatorHandle(handle: string | undefined): void {
  cachedHandle = handle ?? null;
}
