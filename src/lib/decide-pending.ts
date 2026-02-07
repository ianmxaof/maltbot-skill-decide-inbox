/**
 * In-memory store for pending dev actions (Tier 3).
 * Agent proposes via POST /api/decide/propose with category: "dev";
 * Human approves/denies in Decide Inbox; approved actions are executed (Phase 2).
 *
 * For production, replace with a database (e.g. SQLite, PostgreSQL).
 */

import type { DevAction } from "@/types/dashboard";
import { mockDevActions } from "@/data/mock-dev-actions";

export type DevPayload = {
  type: string;
  path?: string;
  packageName?: string;
  content?: string;
  diff?: string;
};

export type PendingDevAction = DevAction & {
  devPayload?: DevPayload;
};

const store: Map<string, PendingDevAction> = new Map();

let idCounter = 1;
function nextId(): string {
  return `dev-${Date.now()}-${idCounter++}`;
}

/** Seed store with mock dev actions for testing (only on first load). Set to true to enable mock data. */
const ENABLE_MOCK_SEED = false;
let seeded = false;
function seedIfNeeded(): void {
  if (seeded || !ENABLE_MOCK_SEED) return;
  seeded = true;
  for (const item of mockDevActions) {
    if (item.status === "pending") {
      store.set(item.id, { ...item } as PendingDevAction);
    }
  }
}

export function addPendingDev(
  item: Omit<PendingDevAction, "id" | "createdAt" | "status">
): PendingDevAction {
  seedIfNeeded();
  const id = nextId();
  const full: PendingDevAction = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
    visibility: "private",
  };
  store.set(id, full);
  return full;
}

export function getPendingDev(id: string): PendingDevAction | undefined {
  seedIfNeeded();
  return store.get(id);
}

export function listPendingDev(): PendingDevAction[] {
  seedIfNeeded();
  return Array.from(store.values()).filter((i) => i.status === "pending");
}

export function markApprovedDev(id: string): PendingDevAction | undefined {
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "approved" as const };
  store.set(id, updated);
  return updated;
}

export function markIgnoredDev(id: string): PendingDevAction | undefined {
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "ignored" as const };
  store.set(id, updated);
  return updated;
}

export function removeDev(id: string): boolean {
  return store.delete(id);
}
