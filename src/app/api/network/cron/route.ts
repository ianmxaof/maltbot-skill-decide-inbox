/**
 * POST /api/network/cron — Scheduled computation endpoint
 *
 * Query: scope=fast|heavy
 * - fast (every 15 min): convergence detection + pulse computation
 * - heavy (every hour): group detection + alignment recomputation
 *
 * Optional header: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { detectConvergences } from "@/lib/convergence-engine";
import { computePulse } from "@/lib/pulse-engine";
import { detectGroups } from "@/lib/group-engine";
import { recomputeAllAlignments } from "@/lib/alignment-engine";
import { setPulse } from "@/lib/network-store";

export async function POST(req: NextRequest) {
  try {
    // Optional auth
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "fast";
    const results: Record<string, unknown> = { scope };

    if (scope === "fast" || scope === "all") {
      // Convergence detection
      const convergences = await detectConvergences(24);
      results.convergences = convergences.length;

      // Pulse computation
      const pulse = await computePulse("day");
      await setPulse(pulse);
      results.pulse = {
        totalDecisions: pulse.totalDecisions,
        activePairs: pulse.activePairs,
        velocityTrend: pulse.velocityTrend,
        trendingSignals: pulse.trendingSignals.length,
        anomalies: pulse.networkAnomalies.length,
      };
    }

    if (scope === "heavy" || scope === "all") {
      // Group detection
      const groups = await detectGroups();
      results.groups = groups.length;

      // Alignment recomputation
      const alignmentCount = await recomputeAllAlignments();
      results.alignments = alignmentCount;
    }

    return NextResponse.json({
      success: true,
      computedAt: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron computation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Also support GET for Vercel cron (Vercel cron calls GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}
