/**
 * GET  /api/security/immutable-audit          — Read recent entries
 * GET  /api/security/immutable-audit?verify=1 — Verify chain integrity
 * GET  /api/security/immutable-audit?stats=1  — Get audit statistics
 */

import { NextRequest, NextResponse } from "next/server";
import {
  readRecentAudit,
  verifyAuditChain,
  getAuditStats,
} from "@/lib/security/immutable-audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Chain verification
    if (searchParams.get("verify") === "1") {
      const result = await verifyAuditChain();
      return NextResponse.json(result);
    }

    // Stats
    if (searchParams.get("stats") === "1") {
      const stats = await getAuditStats();
      return NextResponse.json(stats);
    }

    // Read recent entries
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;
    const entries = await readRecentAudit(limit);

    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    console.error("[API] security/immutable-audit:", error);
    return NextResponse.json(
      { error: "Failed to read immutable audit trail" },
      { status: 500 }
    );
  }
}
