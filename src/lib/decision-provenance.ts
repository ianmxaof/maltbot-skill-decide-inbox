/**
 * Decision provenance: full audit trail from trigger to outcome.
 * Append-only store in .data/decision-provenance.json.
 */

import { kv } from "@/lib/db";
import type { DecisionProvenance } from "@/types/governance";

export async function appendProvenance(record: DecisionProvenance): Promise<void> {
  let items: DecisionProvenance[] = [];
  try {
    const data = await kv.get<{ items?: DecisionProvenance[] }>("decision-provenance");
    items = Array.isArray(data?.items) ? data.items : [];
  } catch {
    items = [];
  }
  items.push(record);
  await kv.set("decision-provenance", { version: 1, items });
}
