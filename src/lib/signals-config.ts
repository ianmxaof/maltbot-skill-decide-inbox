/**
 * Config for Signals panel: RSS URLs. Stored in .data/signals.json.
 */

import { kv } from "@/lib/db";
import type { Visibility } from "@/types/governance";

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
    const data = await kv.get<SignalsConfig>("signals");
    if (!data) return DEFAULT;
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
  await kv.set("signals", {
    rssUrls: config.rssUrls ?? [],
    githubUsers: config.githubUsers ?? [],
    githubRepos: config.githubRepos ?? [],
    operatorId: config.operatorId,
    visibility: config.visibility ?? "private",
  });
}
