/**
 * GET /api/moltbook/pending
 * Returns pending social actions (proposed by agent, awaiting human decision).
 */

import { NextResponse } from "next/server";
import { listPending } from "@/lib/moltbook-pending";

export async function GET() {
  const items = await listPending();
  return NextResponse.json({ items });
}
