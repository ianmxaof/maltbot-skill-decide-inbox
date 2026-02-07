/**
 * System state (MET switch): human-initiated halt of all autonomous execution.
 * Persists to .data/system-state.json. When mode === 'halted', nothing autonomous runs.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { SystemState as SystemStateType } from "@/types/governance";

const STATE_PATH = path.join(process.cwd(), ".data", "system-state.json");

const DEFAULT_STATE: SystemStateType = {
  mode: "active",
};

let cached: SystemStateType | null = null;

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(STATE_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

export async function loadSystemState(): Promise<SystemStateType> {
  if (cached) return cached;
  try {
    if (!existsSync(STATE_PATH)) {
      cached = { ...DEFAULT_STATE };
      return cached;
    }
    const raw = await readFile(STATE_PATH, "utf-8");
    const data = JSON.parse(raw) as SystemStateType;
    if (data.mode && ["active", "supervised", "halted"].includes(data.mode)) {
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
  await ensureDataDir();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
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
