/**
 * Signal outcomes: record how a signal was used and what happened (for future weighting).
 * Append-only store in .data/signal-outcomes.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { SignalOutcome } from "@/types/governance";

const OUTCOMES_PATH = path.join(process.cwd(), ".data", "signal-outcomes.json");

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(OUTCOMES_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

export async function appendSignalOutcome(outcome: SignalOutcome): Promise<void> {
  await ensureDataDir();
  let items: SignalOutcome[] = [];
  if (existsSync(OUTCOMES_PATH)) {
    const raw = await readFile(OUTCOMES_PATH, "utf-8");
    try {
      const data = JSON.parse(raw) as { items?: SignalOutcome[] };
      items = Array.isArray(data?.items) ? data.items : [];
    } catch {
      items = [];
    }
  }
  items.push(outcome);
  await writeFile(
    OUTCOMES_PATH,
    JSON.stringify({ version: 1, items }, null, 2),
    "utf-8"
  );
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
