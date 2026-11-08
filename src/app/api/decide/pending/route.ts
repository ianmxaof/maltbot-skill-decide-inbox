/**
 * GET /api/decide/pending
 * Unified pending list: social (Moltbook) + dev actions + signal + worker decide queue.
 * Merges from moltbook-pending, decide-pending, signal-pending, and worker-decide-queue (kv).
 */

import { NextRequest, NextResponse } from "next/server";
import { listPending } from "@/lib/moltbook-pending";
import { listPendingDev } from "@/lib/decide-pending";
import { listPendingSignals } from "@/lib/signal-pending";
import { kv } from "@/lib/db";
import type { DecideInboxItem } from "@/types/dashboard";

interface DecideQueueItem {
  id: string;
  pairId: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  sourceName: string;
  urgency: string;
  status: string;
  ingestedAt: string;
}

function mapWorkerItemToDecide(w: DecideQueueItem): DecideInboxItem {
  const source: "moltbook" | "rss" | "github" = w.sourceName?.includes("/")
    ? "github"
    : "rss";
  return {
    id: w.id,
    createdAt: w.ingestedAt,
    riskLevel: (w.urgency === "critical" ? "critical" : w.urgency === "high" ? "high" : w.urgency === "medium" ? "medium" : "low") as "low" | "medium" | "high" | "critical",
    status: w.status as "pending" | "approved" | "ignored" | "deeper",
    category: "signal",
    title: w.title,
    url: w.sourceUrl,
    summary: w.summary,
    source,
  };
}

export async function GET(req: NextRequest) {
  const pairId = req.nextUrl.searchParams.get("pairId");

  const [socialItems, devItems, signalItems, queueRaw] = await Promise.all([
    listPending(),
    Promise.resolve(listPendingDev()),
    listPendingSignals(),
    kv.get<DecideQueueItem[]>("worker-decide-queue"),
  ]);

  let workerItems: DecideInboxItem[] = [];
  const queue = Array.isArray(queueRaw) ? queueRaw : [];
  const pending = queue.filter((q) => q.status === "pending");
  if (pairId) {
    workerItems = pending.filter((q) => q.pairId === pairId).map(mapWorkerItemToDecide);
  } else {
    workerItems = pending.map(mapWorkerItemToDecide);
  }

  const items: DecideInboxItem[] = [...socialItems, ...devItems, ...signalItems, ...workerItems];
  items.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  return NextResponse.json({ items });
}
