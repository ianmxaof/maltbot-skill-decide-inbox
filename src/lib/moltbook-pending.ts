/**
 * Store for pending Moltbook social actions.
 * Agent proposes via POST /api/moltbook/actions/propose or autopilot adds via heartbeat;
 * Human approves/denies in Decide Inbox; approved actions are executed via Moltbook API.
 * Persists to .data/moltbook-pending.json so items survive restarts and appear in Decide Inbox.
 *
 * For production, replace with a database (e.g. SQLite, PostgreSQL).
 */

import { kv } from "@/lib/db";
import type { SocialAction } from "@/types/dashboard";

export type MoltbookPayload = {
  type: "post" | "comment" | "follow" | "create_submolt";
  rosterAgentId?: string;
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

const store = new Map<string, PendingSocialAction>();
let loaded = false;
let idCounter = 1;

function nextId(): string {
  return `moltbook-${Date.now()}-${idCounter++}`;
}

async function loadStore(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const data = await kv.get<{ items: PendingSocialAction[] }>("moltbook-pending");
    const items = Array.isArray(data?.items) ? data.items : [];
    store.clear();
    for (const item of items) {
      if (item?.id && item?.status === "pending") {
        store.set(item.id, item);
      }
    }
  } catch {
    store.clear();
  }
}

async function saveStore(): Promise<void> {
  const items = Array.from(store.values()).filter((i) => i.status === "pending");
  await kv.set("moltbook-pending", { version: 1, items });
}

export async function addPending(
  item: Omit<PendingSocialAction, "id" | "createdAt" | "status">
): Promise<PendingSocialAction> {
  await loadStore();
  const id = nextId();
  const full: PendingSocialAction = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
    visibility: "private",
  };
  store.set(id, full);
  await saveStore();
  return full;
}

export async function getPending(id: string): Promise<PendingSocialAction | undefined> {
  await loadStore();
  return store.get(id);
}

export async function listPending(): Promise<PendingSocialAction[]> {
  await loadStore();
  return Array.from(store.values()).filter((i) => i.status === "pending");
}

export async function markApproved(id: string): Promise<PendingSocialAction | undefined> {
  await loadStore();
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "approved" as const };
  store.set(id, updated);
  await saveStore();
  return updated;
}

export async function markIgnored(id: string): Promise<PendingSocialAction | undefined> {
  await loadStore();
  const item = store.get(id);
  if (!item) return undefined;
  const updated = { ...item, status: "ignored" as const };
  store.set(id, updated);
  await saveStore();
  return updated;
}

export async function remove(id: string): Promise<boolean> {
  await loadStore();
  const deleted = store.delete(id);
  if (deleted) await saveStore();
  return deleted;
}
