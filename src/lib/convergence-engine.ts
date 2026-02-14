// src/lib/convergence-engine.ts
// Cross-pair signal convergence detection.
// Scans recent network activity to find signals multiple pairs reacted to.

import type {
  SignalConvergence,
  ConvergenceType,
  ConvergencePair,
  ConvergenceAction,
} from "@/types/network";
import { getNetworkActivity } from "./social-store";
import { getFollowingBy, getAlignmentBetween } from "./social-store";
import { getConvergences, setConvergences } from "./network-store";

// ─── Signal Extraction ──────────────────────────────────────

interface ExtractedSignal {
  key: string;
  label: string;
  category: string;
  action: string;
  pairId: string;
  activityId: string;
  at: string;
}

const SIGNAL_PATTERNS: { pattern: RegExp; category: string; keyPrefix: string }[] = [
  { pattern: /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g, category: "repository", keyPrefix: "repo:" },
  { pattern: /CVE-\d{4}-\d{4,}/g, category: "vulnerability", keyPrefix: "cve:" },
  { pattern: /m\/([a-zA-Z0-9_-]+)/g, category: "topic", keyPrefix: "topic:" },
];

const ACTION_KEYWORDS: { pattern: RegExp; action: string }[] = [
  { pattern: /\bescalat/i, action: "escalated" },
  { pattern: /\bapproved?\b/i, action: "approved" },
  { pattern: /\btrack(ing|ed)?\b/i, action: "started tracking" },
  { pattern: /\bflagg(ed|ing)?\b/i, action: "flagged" },
  { pattern: /\bpassed on\b/i, action: "ignored" },
];

function extractSignals(
  pairId: string,
  activityId: string,
  summary: string,
  at: string
): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];
  const action = ACTION_KEYWORDS.find((a) => a.pattern.test(summary))?.action ?? "acted on";

  for (const { pattern, category, keyPrefix } of SIGNAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(summary)) !== null) {
      const raw = match[1] ?? match[0];
      signals.push({
        key: `${keyPrefix}${raw.toLowerCase()}`,
        label: raw,
        category,
        action,
        pairId,
        activityId,
        at,
      });
    }
  }

  return signals;
}

// ─── Convergence Detection ──────────────────────────────────

function inferType(actions: string[]): ConvergenceType {
  const counts: Record<string, number> = {};
  for (const a of actions) counts[a] = (counts[a] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  if (top === "escalated") return "escalation_cluster";
  if (top === "started tracking") return "tracking_wave";
  if (top === "approved" || top === "ignored") return "decision_alignment";
  if (top === "flagged") return "anomaly_consensus";
  return "context_convergence";
}

/**
 * Detect convergences from recent network activity.
 * Call on a 15-minute schedule.
 */
export async function detectConvergences(
  windowHours: number = 24
): Promise<SignalConvergence[]> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const activities = await getNetworkActivity({ before: undefined, limit: 500 });
  const recent = activities.filter((a) => a.createdAt > since);

  // Extract signals from all activities
  const allSignals: ExtractedSignal[] = [];
  for (const act of recent) {
    allSignals.push(...extractSignals(act.pairId, act.id, act.summary, act.createdAt));
  }

  // Group by signal key
  const byKey = new Map<string, ExtractedSignal[]>();
  for (const sig of allSignals) {
    const existing = byKey.get(sig.key) ?? [];
    existing.push(sig);
    byKey.set(sig.key, existing);
  }

  // Build convergences (only for signals with 2+ unique pairs)
  const convergences: SignalConvergence[] = [];

  for (const [key, signals] of byKey) {
    const uniquePairIds = Array.from(new Set(signals.map((s) => s.pairId)));
    if (uniquePairIds.length < 2) continue;

    const first = signals.reduce((a, b) => (a.at < b.at ? a : b));
    const last = signals.reduce((a, b) => (a.at > b.at ? a : b));

    // Compute velocity
    const spanMs = new Date(last.at).getTime() - new Date(first.at).getTime();
    const spanHours = Math.max(spanMs / (1000 * 60 * 60), 0.01);
    const velocityPerHour = uniquePairIds.length / spanHours;

    // Aggregate actions
    const actionCounts = new Map<string, number>();
    for (const s of signals) {
      actionCounts.set(s.action, (actionCounts.get(s.action) ?? 0) + 1);
    }
    const actions: ConvergenceAction[] = Array.from(actionCounts.entries()).map(([action, count]) => ({
      action,
      count,
      percentage: count / signals.length,
    }));

    const convergingPairs: ConvergencePair[] = uniquePairIds.map((pid) => {
      const pairSignals = signals.filter((s) => s.pairId === pid);
      return {
        pairId: pid,
        pairName: pid, // enriched later when rendering
        action: pairSignals[0]?.action ?? "acted on",
        actionAt: pairSignals[0]?.at ?? new Date().toISOString(),
      };
    });

    const window: "hour" | "day" | "week" =
      windowHours <= 1 ? "hour" : windowHours <= 24 ? "day" : "week";

    const strength = Math.min(1, (uniquePairIds.length - 1) * 0.25 + velocityPerHour * 0.1);

    convergences.push({
      id: `conv_${Date.now()}_${convergences.length}`,
      type: inferType(signals.map((s) => s.action)),
      strength,
      signalKey: key,
      signalLabel: first.label,
      signalCategory: first.category,
      convergingPairIds: uniquePairIds,
      convergingPairs,
      totalPairs: uniquePairIds.length,
      actions,
      firstOccurrence: first.at,
      lastOccurrence: last.at,
      velocityPerHour,
      window,
      relevanceToViewer: 0, // set per-viewer on read
      viewerHasActed: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Sort by strength
  convergences.sort((a, b) => b.strength - a.strength);

  await setConvergences(convergences);
  return convergences;
}

/**
 * Enrich convergences with viewer-specific relevance.
 */
export async function enrichForViewer(
  viewerPairId: string,
  convergences: SignalConvergence[]
): Promise<SignalConvergence[]> {
  const following = await getFollowingBy(viewerPairId);
  const followingIds = new Set(following.map((f) => f.followingId));

  return convergences.map((c) => {
    const viewerHasActed = c.convergingPairIds.includes(viewerPairId);
    const followedInConvergence = c.convergingPairIds.filter((id) => followingIds.has(id)).length;
    const relevanceToViewer = Math.min(
      1,
      (viewerHasActed ? 0.5 : 0) +
        (followedInConvergence / Math.max(c.totalPairs, 1)) * 0.5
    );

    return { ...c, relevanceToViewer, viewerHasActed };
  });
}
