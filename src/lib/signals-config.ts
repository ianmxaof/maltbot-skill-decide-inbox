/**
 * Config for Signals panel: RSS URLs. Stored in .data/signals.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Visibility } from "@/types/governance";

const SIGNALS_PATH = path.join(process.cwd(), ".data", "signals.json");

export type SignalsConfig = {
  rssUrls?: string[];
  githubUsers?: string[];
  githubRepos?: string[];
  operatorId?: string; // attribution (social layer); single-tenant = one per deployment
  visibility?: Visibility; // default "private"
};

const DEFAULT: SignalsConfig = { rssUrls: [], githubUsers: [], githubRepos: [] };

export async function readSignalsConfig(): Promise<SignalsConfig> {
  try {
    if (!existsSync(SIGNALS_PATH)) return DEFAULT;
    const raw = await readFile(SIGNALS_PATH, "utf-8");
    const data = JSON.parse(raw) as SignalsConfig;
    return {
      rssUrls: Array.isArray(data.rssUrls) ? data.rssUrls : [],
      githubUsers: Array.isArray(data.githubUsers) ? data.githubUsers : [],
      githubRepos: Array.isArray(data.githubRepos) ? data.githubRepos : [],
      operatorId: typeof data.operatorId === "string" ? data.operatorId : undefined,
      visibility: data.visibility === "semi_public" || data.visibility === "network_emergent" ? data.visibility : "private",
    };
  } catch {
    return DEFAULT;
  }
}

export async function writeSignalsConfig(config: SignalsConfig): Promise<void> {
  const dir = path.dirname(SIGNALS_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(
    SIGNALS_PATH,
    JSON.stringify(
      {
        rssUrls: config.rssUrls ?? [],
        githubUsers: config.githubUsers ?? [],
        githubRepos: config.githubRepos ?? [],
        operatorId: config.operatorId,
        visibility: config.visibility ?? "private",
      },
      null,
      2
    ),
    "utf-8"
  );
}
