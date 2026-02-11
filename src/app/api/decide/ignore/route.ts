/**
 * POST /api/decide/ignore
 * Mark a proposed action as ignored. Routes by store:
 * - decide-pending (dev) -> markIgnoredDev
 * - moltbook-pending -> markIgnored
 * - signal-pending -> resolveSignal(id, "ignored")
 *
 * Body: { id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { markIgnored } from "@/lib/moltbook-pending";
import { getPendingDev, markIgnoredDev } from "@/lib/decide-pending";
import { resolveSignal } from "@/lib/signal-pending";
import { appendProvenance } from "@/lib/decision-provenance";
import { recordOutcomesForDecision } from "@/lib/signal-outcomes";
import { projectDecisionToFeed } from "@/lib/social-store";
import { getActivePairId } from "@/lib/agent-pair-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const deniedBy = (body.deniedBy as string) || "dashboard";

    const activePairId = await getActivePairId();

    // Dev action
    const devItem = getPendingDev(id);
    if (devItem) {
      markIgnoredDev(id);
      await appendProvenance({
        decisionId: id,
        triggeredBy: [],
        awarenessResult: { allowed: true },
        humanApproval: { approvedBy: deniedBy, timestamp: new Date().toISOString(), notes: "ignored" },
      });
      await recordOutcomesForDecision(id, "ignored", [], "unknown");
      await projectDecisionToFeed(activePairId, "ignore", devItem.title ?? id, id).catch(() => {});
      return NextResponse.json({ success: true });
    }

    // Signal (Send to inbox)
    if (id.startsWith("signal-")) {
      const updated = await resolveSignal(id, "ignored");
      if (updated) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { success: false, error: "Not found or already processed" },
        { status: 404 }
      );
    }

    // Social action
    const item = await markIgnored(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Not found or already processed" },
        { status: 404 }
      );
    }
    await appendProvenance({
      decisionId: id,
      triggeredBy: [],
      awarenessResult: { allowed: true },
      humanApproval: { approvedBy: deniedBy, timestamp: new Date().toISOString(), notes: "ignored" },
    });
    await recordOutcomesForDecision(id, "ignored", [], "unknown");
    await projectDecisionToFeed(activePairId, "ignore", item.title ?? id, id).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ignore failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
