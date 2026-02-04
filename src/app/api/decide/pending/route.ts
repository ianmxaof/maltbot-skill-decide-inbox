/**
 * GET /api/decide/pending
 * Unified pending list: social (Moltbook) + dev actions.
 * Merges from moltbook-pending and decide-pending.
 */

import { NextResponse } from "next/server";
import { listPending } from "@/lib/moltbook-pending";
import { listPendingDev } from "@/lib/decide-pending";
import type { DecideInboxItem } from "@/types/dashboard";

export async function GET() {
  const socialItems = await listPending();
  const devItems = listPendingDev();
  const items: DecideInboxItem[] = [...socialItems, ...devItems];
  // Sort by createdAt descending
  items.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  return NextResponse.json({ items });
}
