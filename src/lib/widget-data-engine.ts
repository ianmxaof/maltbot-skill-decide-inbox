/**
 * Widget Data Engine — The Nightly Build
 *
 * Computes widget data payloads from existing data stores.
 * Each widget type has a data fetcher that pulls from the pair's
 * existing activity, governance, and context data.
 */

import type { AgentHumanPair } from "@/types/agent-pair";
import type { WidgetDataPayload, ProfileWidget } from "@/types/social";
import { getNetworkActivity } from "@/lib/social-store";
import { getWorkersForPair } from "@/lib/worker-store";
import { getActivityFeed } from "@/lib/activity-feed-store";
import { getBookmarks } from "@/lib/bookmark-store";
import { getIntegration } from "@/lib/integrations/store";
import { fetchHNProfileData } from "@/lib/integrations/providers/hackernews";
import type { HNWidgetData } from "@/types/integration";

/**
 * Compute widget data payloads for all visible widgets on a pair's profile.
 * Only fetches data for widget types that are actually active.
 */
export async function computeWidgetData(
  pair: AgentHumanPair,
  widgets: ProfileWidget[]
): Promise<WidgetDataPayload> {
  const activeTypes = new Set(widgets.filter(w => w.visible).map(w => w.type));
  const payload: WidgetDataPayload = {};

  // Run all data fetchers in parallel
  const fetchers: Promise<void>[] = [];

  if (activeTypes.has("decision_chart")) {
    fetchers.push(fetchDecisionChart(pair.id).then(d => { payload.decisionChart = d; }));
  }

  if (activeTypes.has("governance_gauge")) {
    fetchers.push(fetchGovernanceGauge(pair).then(d => { payload.governanceGauge = d; }));
  }

  if (activeTypes.has("agent_uptime")) {
    fetchers.push(fetchAgentUptime(pair.id).then(d => { payload.agentUptime = d; }));
  }

  if (activeTypes.has("rss_ticker")) {
    fetchers.push(fetchRssTicker(pair.id).then(d => { payload.rssTicker = d; }));
  }

  if (activeTypes.has("github_heatmap")) {
    fetchers.push(fetchGithubHeatmap(pair).then(d => { payload.githubHeatmap = d; }));
  }

  if (activeTypes.has("shipped_this_week")) {
    fetchers.push(fetchShippedThisWeek(pair.id).then(d => { payload.shippedThisWeek = d; }));
  }

  if (activeTypes.has("context_map")) {
    payload.contextMap = computeContextMap(pair);
  }

  if (activeTypes.has("reading_list")) {
    fetchers.push(fetchReadingList(pair.id).then(d => { payload.readingList = d; }));
  }

  if (activeTypes.has("hackernews")) {
    fetchers.push(fetchHNWidget(pair.id).then(d => { payload.hackernews = d; }));
  }

  await Promise.all(fetchers);
  return payload;
}

// ─── Decision Chart ────────────────────────────────────────

async function fetchDecisionChart(pairId: string) {
  const activities = await getNetworkActivity({
    pairId,
    types: ["decision"],
    limit: 500,
  });

  let approved = 0;
  let ignored = 0;
  let escalated = 0;

  for (const a of activities) {
    const s = a.summary.toLowerCase();
    if (s.startsWith("approved")) approved++;
    else if (s.startsWith("passed on")) ignored++;
    else if (s.startsWith("escalated")) escalated++;
    else approved++; // default
  }

  return {
    approved,
    ignored,
    escalated,
    total: approved + ignored + escalated,
  };
}

// ─── Governance Gauge ──────────────────────────────────────

async function fetchGovernanceGauge(pair: AgentHumanPair) {
  const riskMap: Record<string, string> = {
    high: "aggressive",
    medium: "moderate",
    low: "conservative",
  };

  // Compute autonomy level from tier configuration
  const tier1Count = pair.autonomyTiers.tier1.length;
  const tier3Count = pair.autonomyTiers.tier3.length;
  const autonomyLevel = tier1Count > tier3Count ? "loose" : tier3Count > tier1Count ? "tight" : "moderate";

  return {
    shipRevertRatio: pair.trustMetrics.shipRevertRatio ?? 0,
    riskTolerance: riskMap[pair.humanPreferences.riskTolerance] ?? "moderate",
    autonomyLevel,
    totalActions: pair.recentAutonomousActions?.length ?? 0,
  };
}

// ─── Agent Uptime ──────────────────────────────────────────

async function fetchAgentUptime(pairId: string) {
  try {
    const workers = await getWorkersForPair(pairId);
    if (!workers || workers.length === 0) {
      return { status: "offline" as const };
    }

    // Find the most recently active worker
    const sorted = [...workers].sort((a, b) =>
      (b.lastHeartbeatAt ?? "").localeCompare(a.lastHeartbeatAt ?? "")
    );
    const active = sorted[0];

    const isOnline = active.status === "online";
    const isIdle = active.status === "idle";

    return {
      status: isOnline ? "online" as const : isIdle ? "idle" as const : "offline" as const,
      lastHeartbeat: active.lastHeartbeatAt,
      uptimeSince: active.registeredAt,
      currentTask: isOnline ? `Monitoring ${active.aspect ?? "signals"}` : undefined,
    };
  } catch {
    return { status: "offline" as const };
  }
}

// ─── RSS Ticker ────────────────────────────────────────────

async function fetchRssTicker(pairId: string) {
  // Pull from network activity (signal type) as the most reliable source
  const activities = await getNetworkActivity({
    pairId,
    types: ["signal", "context_change"],
    limit: 10,
  });

  return activities.map(a => ({
    id: a.id,
    title: a.summary,
    source: a.type === "signal" ? "Signal" : "Context",
    publishedAt: a.createdAt,
  }));
}

// ─── GitHub Heatmap ────────────────────────────────────────

async function fetchGithubHeatmap(pair: AgentHumanPair) {
  // Build heatmap from network activity + activity feed data
  const activities = await getNetworkActivity({
    pairId: pair.id,
    types: ["agent_action", "decision"],
    limit: 500,
  });

  // Aggregate by date
  const countMap = new Map<string, number>();
  for (const a of activities) {
    const date = a.createdAt.slice(0, 10);
    countMap.set(date, (countMap.get(date) ?? 0) + 1);
  }

  const contributions = Array.from(countMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    contributions,
    totalContributions: activities.length,
    repos: pair.contextSources.githubRepos ?? [],
  };
}

// ─── Shipped This Week ─────────────────────────────────────

async function fetchShippedThisWeek(pairId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString();

  // Pull approved actions from activity feed
  const activities = await getActivityFeed({ pairId, limit: 50, since });

  return activities
    .filter(a => a.outcome === "kept" || a.action.toLowerCase().includes("approved"))
    .map(a => ({
      id: a.id,
      action: a.action,
      summary: a.reasoning || a.action,
      shippedAt: a.timestamp,
    }))
    .slice(0, 10);
}

// ─── Context Map ───────────────────────────────────────────

function computeContextMap(pair: AgentHumanPair) {
  const sources: Array<{ type: string; name: string; category: string; signalCount: number }> = [];

  for (const repo of pair.contextSources.githubRepos ?? []) {
    sources.push({
      type: "github_repo",
      name: repo,
      category: "code",
      signalCount: 0,
    });
  }

  for (const user of pair.contextSources.githubUsers ?? []) {
    sources.push({
      type: "github_repo",
      name: `@${user}`,
      category: "developer",
      signalCount: 0,
    });
  }

  for (const url of pair.contextSources.rssUrls ?? []) {
    // Extract domain as name
    let name = url;
    try {
      const u = new URL(url);
      name = u.hostname.replace("www.", "");
    } catch { /* use full url */ }

    sources.push({
      type: "rss_feed",
      name,
      category: "feed",
      signalCount: 0,
    });
  }

  for (const topic of pair.contextSources.moltbookTopics ?? []) {
    sources.push({
      type: "moltbook_topic",
      name: topic,
      category: "discussion",
      signalCount: 0,
    });
  }

  return sources;
}

// ─── Reading List ──────────────────────────────────────────

// ─── Hacker News ──────────────────────────────────────────

async function fetchHNWidget(pairId: string): Promise<HNWidgetData | undefined> {
  try {
    const integration = await getIntegration(pairId, "hackernews");
    if (!integration || !integration.active) return undefined;

    const data = await fetchHNProfileData(integration.connectionData.username);
    if (!data) return undefined;
    return data.widgetData as unknown as HNWidgetData;
  } catch {
    return undefined;
  }
}

// ─── Reading List ──────────────────────────────────────────

async function fetchReadingList(pairId: string) {
  // Pull from the bookmark store (primary) + fallback to activity feed
  const bookmarks = await getBookmarks(pairId, 10);

  if (bookmarks.length > 0) {
    return bookmarks.map(b => ({
      id: b.id,
      title: b.title,
      source: b.source,
      url: b.url,
      savedAt: b.savedAt,
    }));
  }

  // Fallback: pull from activity feed items that look like saved/bookmarked content
  const activities = await getActivityFeed({ pairId, limit: 30 });

  return activities
    .filter(a => a.tags?.includes("bookmarked") || a.tags?.includes("starred") || a.tags?.includes("saved"))
    .map(a => ({
      id: a.id,
      title: a.reasoning || a.action,
      source: a.tags?.[0] ?? "Saved",
      savedAt: a.timestamp,
    }))
    .slice(0, 8);
}
