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
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { markIgnored } from "@/lib/moltbook-pending";
import { getPendingDev, markIgnoredDev } from "@/lib/decide-pending";
import { resolveSignal } from "@/lib/signal-pending";
import { appendProvenance } from "@/lib/decision-provenance";
import { recordOutcomesForDecision } from "@/lib/signal-outcomes";
import { projectDecisionToFeed } from "@/lib/social-store";
import { getActivePairId } from "@/lib/agent-pair-store";
import { recordDecision as recordDisclosureDecision } from "@/lib/disclosure-store";
import { createNotification } from "@/lib/notification-store";

const IgnoreSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  deniedBy: z.string().trim().default("dashboard"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(IgnoreSchema, body);
    if (!parsed.ok) return parsed.response;
    const { id, deniedBy } = parsed.data;

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
      await projectDecisionToFeed(activePairId, "ignore", devItem.title ?? id, id).catch((e) => console.error("[decide/ignore] projectDecisionToFeed failed:", e));
      // Record in disclosure state machine
      const { newlyUnlocked } = await recordDisclosureDecision(activePairId).catch((e) => { console.error("[decide/ignore] recordDisclosureDecision failed:", e); return { newlyUnlocked: [] as string[] }; });
      for (const feat of newlyUnlocked) {
        await createNotification(activePairId, "feature_unlock", "New feature unlocked", `You unlocked: ${feat.replace(/_/g, " ")}`, "/home").catch((e) => console.error("[decide/ignore] createNotification failed:", e));
      }
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
    await projectDecisionToFeed(activePairId, "ignore", item.title ?? id, id).catch((e) => console.error("[decide/ignore] projectDecisionToFeed failed:", e));
    // Record in disclosure state machine
    const { newlyUnlocked: unlocked2 } = await recordDisclosureDecision(activePairId).catch((e) => { console.error("[decide/ignore] recordDisclosureDecision failed:", e); return { newlyUnlocked: [] as string[] }; });
    for (const feat of unlocked2) {
      await createNotification(activePairId, "feature_unlock", "New feature unlocked", `You unlocked: ${feat.replace(/_/g, " ")}`, "/home").catch((e) => console.error("[decide/ignore] createNotification failed:", e));
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ignore failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
