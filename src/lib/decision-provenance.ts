/**
 * Decision provenance: full audit trail from trigger to outcome.
 * Append-only store in .data/decision-provenance.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { DecisionProvenance } from "@/types/governance";

const PROVENANCE_PATH = path.join(process.cwd(), ".data", "decision-provenance.json");

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(PROVENANCE_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

export async function appendProvenance(record: DecisionProvenance): Promise<void> {
  await ensureDataDir();
  let items: DecisionProvenance[] = [];
  if (existsSync(PROVENANCE_PATH)) {
    const raw = await readFile(PROVENANCE_PATH, "utf-8");
    try {
      const data = JSON.parse(raw) as { items?: DecisionProvenance[] };
      items = Array.isArray(data?.items) ? data.items : [];
    } catch {
      items = [];
    }
  }
  items.push(record);
  await writeFile(
    PROVENANCE_PATH,
    JSON.stringify({ version: 1, items }, null, 2),
    "utf-8"
  );
}
