/**
 * Per-operation overrides: allow, block, or ask for specific operation (and optional target/agent).
 * Persisted to .data/operation-overrides.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Visibility } from "@/types/governance";

export interface OperationOverride {
  operation: string; // e.g. "write:moltbook_post"
  target?: string; // e.g. "m/politics", "@SomeAgent"
  scope?: "global" | "agent";
  agentId?: string; // when scope is "agent"
  action: "allow" | "block" | "ask";
  expiresAt?: number; // timestamp; temporary overrides
  reason?: string; // audit trail
  operatorId?: string; // attribution (social layer)
  visibility?: Visibility; // default "private"
}

const DEFAULT_PATH = path.join(process.cwd(), ".data", "operation-overrides.json");

let overrides: OperationOverride[] = [];
let loaded = false;

async function ensureDir(): Promise<void> {
  const dir = path.dirname(DEFAULT_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadOperationOverrides(filePath: string = DEFAULT_PATH): Promise<OperationOverride[]> {
  if (loaded && filePath === DEFAULT_PATH) return overrides;
  try {
    if (!existsSync(filePath)) return [];
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as { overrides?: OperationOverride[] };
    overrides = Array.isArray(data?.overrides) ? data.overrides : [];
    loaded = true;
    return overrides;
  } catch {
    return [];
  }
}

export async function saveOperationOverrides(
  list: OperationOverride[],
  filePath: string = DEFAULT_PATH
): Promise<void> {
  await ensureDir();
  overrides = list;
  loaded = true;
  await writeFile(filePath, JSON.stringify({ version: 1, overrides: list }, null, 2), "utf-8");
}

export async function getOperationOverrides(): Promise<OperationOverride[]> {
  return loadOperationOverrides();
}

export async function addOperationOverride(override: OperationOverride): Promise<void> {
  const list = await loadOperationOverrides();
  list.push(override);
  await saveOperationOverrides(list);
}

export async function removeOperationOverride(
  match: { operation: string; target?: string; agentId?: string }
): Promise<boolean> {
  const list = await loadOperationOverrides();
  const before = list.length;
  const filtered = list.filter((o) => {
    if (o.operation !== match.operation) return true;
    if (match.target !== undefined && o.target !== match.target) return true;
    if (match.agentId !== undefined && o.agentId !== match.agentId) return true;
    return false; // remove this entry (matches)
  });
  if (filtered.length === before) return false;
  await saveOperationOverrides(filtered);
  return true;
}

/**
 * Find the best-matching override for (operationKey, target, agentId).
 * Prefer: exact target + agent, then target, then operation only. Respect expiresAt.
 * Override with no target matches any target.
 */
export function resolveOverride(
  overridesList: OperationOverride[],
  operationKey: string,
  target: string | undefined,
  agentId: string | undefined
): OperationOverride | null {
  const now = Date.now();
  const valid = overridesList.filter((o) => !o.expiresAt || o.expiresAt > now);
  const withOp = valid.filter((o) => o.operation === operationKey);
  if (withOp.length === 0) return null;

  const t = target ?? "";

  // Prefer: operation + target + agentId match
  const withTargetAndAgent = withOp.find(
    (o) =>
      (!o.target || o.target === t) &&
      (o.scope !== "agent" || o.agentId === agentId)
  );
  if (withTargetAndAgent) return withTargetAndAgent;

  // Then: operation + target match
  const withTarget = withOp.find((o) => o.target && o.target === t);
  if (withTarget) return withTarget;

  // Then: global (no target) or agent-scoped (no target)
  const global = withOp.find((o) => !o.target && o.scope !== "agent");
  if (global) return global;

  const agentScoped = withOp.find((o) => !o.target && o.scope === "agent" && o.agentId === agentId);
  return agentScoped ?? null;
}
