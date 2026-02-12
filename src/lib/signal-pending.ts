/**
 * Store for pending signal items (Send to inbox from Signals panel).
 * Persists to .data/signal-pending.json. Merged into Decide Inbox via GET /api/decide/pending.
 */

import { kv } from "@/lib/db";

export type PendingSignalSource = "moltbook" | "rss" | "github";

export type PendingSignalItem = {
  id: string;
  createdAt: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "ignored" | "deeper";
  category: "signal";
  title: string;
  url?: string;
  summary?: string;
  source: PendingSignalSource;
  sourceId?: string;
  visibility?: "private" | "semi_public" | "network_emergent";
};

const store = new Map<string, PendingSignalItem>();
let loaded = false;
let idCounter = 1;

function nextId(): string {
  return `signal-${Date.now()}-${idCounter++}`;
}

async function loadStore(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const data = await kv.get<{ items: PendingSignalItem[] }>("signal-pending");
    const items = Array.isArray(data?.items) ? data.items : [];
    store.clear();
    for (const item of items) {
      if (item?.id && item?.category === "signal" && item.status === "pending") {
        store.set(item.id, item);
      }
    }
  } catch {
    store.clear();
  }
}

async function saveStore(): Promise<void> {
  const items = Array.from(store.values()).filter((i) => i.status === "pending");
  await kv.set("signal-pending", { version: 1, items });
}

export type AddSignalInput = {
  title: string;
  url?: string;
  summary?: string;
  source: PendingSignalSource;
  sourceId?: string;
};

export async function addPendingSignal(
  item: AddSignalInput
): Promise<PendingSignalItem> {
  await loadStore();
  const id = nextId();
  const full: PendingSignalItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    riskLevel: "low",
    status: "pending",
    category: "signal",
    visibility: "private",
  };
  store.set(id, full);
  await saveStore();
  return full;
}

export async function listPendingSignals(): Promise<PendingSignalItem[]> {
  await loadStore();
  return Array.from(store.values()).filter((i) => i.status === "pending");
}

export async function resolveSignal(
  id: string,
  status: "ignored" | "approved"
): Promise<PendingSignalItem | undefined> {
  await loadStore();
  const item = store.get(id);
  if (!item) return undefined;
  store.delete(id);
  await saveStore();
  return { ...item, status };
}

export async function removeSignal(id: string): Promise<boolean> {
  await loadStore();
  const deleted = store.delete(id);
  if (deleted) await saveStore();
  return deleted;
}
