/**
 * System state (MET switch): human-initiated halt of all autonomous execution.
 * Persists to .data/system-state.json. When mode === 'halted', nothing autonomous runs.
 */

import { kv } from "@/lib/db";
import type { SystemState as SystemStateType } from "@/types/governance";

const DEFAULT_STATE: SystemStateType = {
  mode: "active",
};

let cached: SystemStateType | null = null;

export async function loadSystemState(): Promise<SystemStateType> {
  if (cached) return cached;
  try {
    const data = await kv.get<SystemStateType>("system-state");
    if (data && data.mode && ["active", "supervised", "halted"].includes(data.mode)) {
      cached = { ...DEFAULT_STATE, ...data };
      return cached;
    }
  } catch {
    // keep default
  }
  cached = cached ?? { ...DEFAULT_STATE };
  return cached;
}

export async function saveSystemState(state: SystemStateType): Promise<void> {
  await kv.set("system-state", state);
  cached = state;
}

/** Set mode (e.g. halted) with optional reason and who halted. */
export async function setSystemState(update: {
  mode: SystemStateType["mode"];
  haltedBy?: string;
  haltReason?: string;
}): Promise<SystemStateType> {
  const current = await loadSystemState();
  const next: SystemStateType = {
    ...current,
    mode: update.mode,
    haltedAt: update.mode === "halted" ? new Date().toISOString() : undefined,
    haltedBy: update.mode === "halted" ? update.haltedBy : undefined,
    haltReason: update.mode === "halted" ? update.haltReason : undefined,
  };
  await saveSystemState(next);
  return next;
}

/** True when no autonomous execution should run. */
export async function isSystemHalted(): Promise<boolean> {
  const state = await loadSystemState();
  return state.mode === "halted";
}

/** In-memory sync check for middleware (load once per request). */
export function getSystemStateSync(): SystemStateType | null {
  return cached;
}

/** Allow middleware to prime cache (e.g. from API). */
export function setSystemStateCache(state: SystemStateType): void {
  cached = state;
}
