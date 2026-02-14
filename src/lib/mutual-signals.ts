/**
 * Mutual Signals Engine — The Nightly Build
 *
 * Computes what context sources two pairs have in common.
 * Powers the "Mutual Signal Badges" feature on profiles.
 */

import type { AgentHumanPair, ContextSources } from "@/types/agent-pair";
import type { MutualSignal, MutualSignalsSummary } from "@/types/social";

/**
 * Compute the overlap in context sources between two pairs.
 * Returns a list of shared signals with display labels.
 */
export function computeMutualSignals(
  pairA: AgentHumanPair,
  pairB: AgentHumanPair
): MutualSignalsSummary {
  const signals: MutualSignal[] = [];

  const srcA = pairA.contextSources ?? {} as ContextSources;
  const srcB = pairB.contextSources ?? {} as ContextSources;

  // GitHub repos
  const reposA = new Set(srcA.githubRepos ?? []);
  for (const repo of srcB.githubRepos ?? []) {
    if (reposA.has(repo)) {
      signals.push({
        type: "github_repo",
        name: repo,
        displayLabel: repo.includes("/") ? repo.split("/").pop()! : repo,
      });
    }
  }

  // GitHub users
  const usersA = new Set(srcA.githubUsers ?? []);
  for (const user of srcB.githubUsers ?? []) {
    if (usersA.has(user)) {
      signals.push({
        type: "github_user",
        name: user,
        displayLabel: `@${user}`,
      });
    }
  }

  // RSS feeds — compare by domain
  const feedDomainsA = new Map<string, string>();
  for (const url of srcA.rssUrls ?? []) {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      feedDomainsA.set(domain, url);
    } catch { /* skip */ }
  }
  for (const url of srcB.rssUrls ?? []) {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      if (feedDomainsA.has(domain)) {
        signals.push({
          type: "rss_feed",
          name: domain,
          displayLabel: domain,
        });
      }
    } catch { /* skip */ }
  }

  // Moltbook topics
  const topicsA = new Set((srcA.moltbookTopics ?? []).map(t => t.toLowerCase()));
  for (const topic of srcB.moltbookTopics ?? []) {
    if (topicsA.has(topic.toLowerCase())) {
      signals.push({
        type: "moltbook_topic",
        name: topic,
        displayLabel: topic,
      });
    }
  }

  return {
    signals,
    totalShared: signals.length,
  };
}
