/**
 * Signal outcomes: record how a signal was used and what happened (for future weighting).
 * Append-only store in .data/signal-outcomes.json.
 */

import { kv } from "@/lib/db";
import type { SignalOutcome } from "@/types/governance";

export async function appendSignalOutcome(outcome: SignalOutcome): Promise<void> {
  let items: SignalOutcome[] = [];
  try {
    const data = await kv.get<{ items?: SignalOutcome[] }>("signal-outcomes");
    items = Array.isArray(data?.items) ? data.items : [];
  } catch {
    items = [];
  }
  items.push(outcome);
  await kv.set("signal-outcomes", { version: 1, items });
}

/** Record one outcome per signal in triggeredBy, or one with decisionId when triggeredBy is empty. */
export async function recordOutcomesForDecision(
  decisionId: string,
  actionTaken: "followed" | "ignored" | "modified",
  signalIds: string[],
  outcome: SignalOutcome["outcome"] = "unknown"
): Promise<void> {
  const timestamp = new Date().toISOString();
  if (signalIds.length === 0) {
    await appendSignalOutcome({
      signalId: decisionId,
      actionTaken,
      outcome,
      timestamp,
    });
    return;
  }
  for (const signalId of signalIds) {
    await appendSignalOutcome({
      signalId,
      actionTaken,
      outcome,
      timestamp,
    });
  }
}
