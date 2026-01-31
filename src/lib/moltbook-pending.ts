/**
 * In-memory store for pending Moltbook social actions.
 * Agent proposes via POST /api/moltbook/actions/propose;
 * Human approves/denies in Decide Inbox; approved actions are executed via Moltbook API.
 *
 * For production, replace with a database (e.g. SQLite, PostgreSQL).
 */

import type { SocialAction } from "@/types/dashboard";

export type MoltbookPayload = {
  type: "post" | "comment" | "follow" | "create_submolt";
  rosterAgentId?: string; // Which roster agent executes (uses their API key)
  submolt?: string;
  title?: string;
  content?: string;
  url?: string;
  postId?: string;
  parentId?: string;
  agentName?: string;
  display_name?: string;
  description?: string;
  name?: string;
};

export type PendingSocialAction = SocialAction & {
  moltbookPayload?: MoltbookPayload;
};

const store: Map<string, PendingSocialAction> = new Map();

let idCounter = 1;
function nextId(): string {
  return `moltbook-${Date.now()}-${idCounter++}`;
}

export function addPending(
  item: Omit<PendingSocialAction, "id" | "createdAt" | "status">
): PendingSocialAction {
  const id = nextId();
  const full: PendingSocialAction = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  store.set(id, full);
  return full;
}

export function getPending(id: string): PendingSocialAction | undefined {
  return store.get(id);
}

export function listPending(): PendingSocialAction[] {
  return Array.from(store.values()).filter((i) => i.status === "pending");
}

export function markApproved(id: string): PendingSocialAction | undefined {
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "approved" as const };
  store.set(id, updated);
  return updated;
}

export function markIgnored(id: string): PendingSocialAction | undefined {
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "ignored" as const };
  store.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return store.delete(id);
}
