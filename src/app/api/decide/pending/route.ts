/**
 * GET /api/decide/pending
 * Unified pending list: social (Moltbook) + dev actions + signal (Send to inbox).
 * Merges from moltbook-pending, decide-pending, and signal-pending.
 */

import { NextResponse } from "next/server";
import { listPending } from "@/lib/moltbook-pending";
import { listPendingDev } from "@/lib/decide-pending";
import { listPendingSignals } from "@/lib/signal-pending";
import type { DecideInboxItem } from "@/types/dashboard";

export async function GET() {
  const [socialItems, devItems, signalItems] = await Promise.all([
    listPending(),
    Promise.resolve(listPendingDev()),
    listPendingSignals(),
  ]);
  const items: DecideInboxItem[] = [...socialItems, ...devItems, ...signalItems];
  items.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  return NextResponse.json({ items });
}
