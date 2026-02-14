// src/lib/pulse-engine.ts
// Computes the collective heartbeat of the network.
// Stateless — recomputable from scratch on any run.

import type {
  NetworkPulse,
  TrendingSignal,
  NetworkAnomaly,
} from "@/types/network";
import { getNetworkActivity } from "./social-store";
import { getAllPublicFingerprints } from "./social-store";
import { getConvergences } from "./network-store";
import { getGroups, getPulse as getPreviousPulse } from "./network-store";

// ─── Signal Extraction (shared with convergence-engine) ─────

function extractSignalKeys(summary: string): { key: string; label: string; category: string }[] {
  const signals: { key: string; label: string; category: string }[] = [];
  const patterns: { pattern: RegExp; category: string; prefix: string }[] = [
    { pattern: /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g, category: "repository", prefix: "repo:" },
    { pattern: /CVE-\d{4}-\d{4,}/g, category: "vulnerability", prefix: "cve:" },
    { pattern: /m\/([a-zA-Z0-9_-]+)/g, category: "topic", prefix: "topic:" },
  ];

  for (const { pattern, category, prefix } of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(summary)) !== null) {
      const raw = match[1] ?? match[0];
      signals.push({ key: `${prefix}${raw.toLowerCase()}`, label: raw, category });
    }
  }
  return signals;
}

// ─── Pulse Computation ──────────────────────────────────────

/**
 * Compute the network pulse. Call every 15 minutes.
 */
export async function computePulse(
  window: "hour" | "day" | "week" = "day"
): Promise<NetworkPulse> {
  const windowMs =
    window === "hour" ? 60 * 60 * 1000 :
    window === "day" ? 24 * 60 * 60 * 1000 :
    7 * 24 * 60 * 60 * 1000;

  const since = new Date(Date.now() - windowMs).toISOString();
  const activities = await getNetworkActivity({ limit: 1000 });
  const recent = activities.filter((a) => a.createdAt > since);

  // All known pairs
  const fingerprints = await getAllPublicFingerprints();
  const totalPairs = fingerprints.length;

  // Activity counts
  const pairIds = new Set(recent.map((a) => a.pairId));
  let totalDecisions = 0;
  let totalEscalations = 0;
  let totalApprovals = 0;
  let totalIgnores = 0;

  for (const act of recent) {
    if (act.type === "decision") {
      totalDecisions++;
      const lower = act.summary.toLowerCase();
      if (lower.includes("approved") || lower.includes("approve")) totalApprovals++;
      else if (lower.includes("escalat")) totalEscalations++;
      else if (lower.includes("passed on") || lower.includes("ignored")) totalIgnores++;
    }
  }

  // Velocity
  const windowHours = windowMs / (1000 * 60 * 60);
  const decisionsPerHour = totalDecisions / Math.max(windowHours, 0.01);

  // Compare with previous pulse for trend
  const previousPulse = await getPreviousPulse();
  let velocityTrend: "accelerating" | "steady" | "slowing" = "steady";
  let velocityDelta = 0;
  if (previousPulse) {
    const prevRate = previousPulse.decisionsPerHour;
    if (prevRate > 0) {
      velocityDelta = ((decisionsPerHour - prevRate) / prevRate) * 100;
      if (velocityDelta > 15) velocityTrend = "accelerating";
      else if (velocityDelta < -15) velocityTrend = "slowing";
    }
  }

  // Collective posture
  const avgApprovalRate = totalDecisions > 0 ? totalApprovals / totalDecisions : 0;
  const avgEscalationRate = totalDecisions > 0 ? totalEscalations / totalDecisions : 0;
  const networkRiskPosture: "conservative" | "moderate" | "aggressive" =
    avgEscalationRate > 0.3 ? "conservative" :
    avgApprovalRate > 0.7 ? "aggressive" : "moderate";

  // Consensus strength: how similar are approval rates across fingerprints?
  let consensusStrength = 0;
  if (fingerprints.length >= 2) {
    const rates = fingerprints.map((f) => f.approvalRate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length;
    consensusStrength = Math.max(0, 1 - Math.sqrt(variance) * 2); // Lower variance = higher consensus
  }

  // Trending signals
  const signalMap = new Map<string, { label: string; category: string; count: number; pairs: Set<string>; first: string }>();
  for (const act of recent) {
    const keys = extractSignalKeys(act.summary);
    for (const { key, label, category } of keys) {
      const existing = signalMap.get(key) ?? { label, category, count: 0, pairs: new Set(), first: act.createdAt };
      existing.count++;
      existing.pairs.add(act.pairId);
      if (act.createdAt < existing.first) existing.first = act.createdAt;
      signalMap.set(key, existing);
    }
  }

  const trendingSignals: TrendingSignal[] = Array.from(signalMap.entries())
    .filter(([, v]) => v.pairs.size >= 2)
    .map(([key, v]) => ({
      key,
      label: v.label,
      category: v.category,
      mentionCount: v.count,
      uniquePairs: v.pairs.size,
      trend: "rising" as const, // simplified: everything with 2+ pairs is "rising"
      firstSeen: v.first,
      velocity: v.count / Math.max(windowHours, 0.01),
    }))
    .sort((a, b) => b.uniquePairs - a.uniquePairs || b.mentionCount - a.mentionCount)
    .slice(0, 10);

  // Convergences
  const activeConvergences = (await getConvergences()).slice(0, 5);

  // Active groups
  const groups = await getGroups();
  const activeGroups = groups
    .filter((g) => g.activityCount > 0)
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 5)
    .map((g) => ({ groupId: g.id, name: g.name, activityCount: g.activityCount }));

  // Anomaly detection
  const networkAnomalies: NetworkAnomaly[] = [];

  if (velocityDelta > 100) {
    networkAnomalies.push({
      id: `anomaly_spike_${Date.now()}`,
      type: "velocity_spike",
      severity: velocityDelta > 200 ? "high" : "medium",
      description: `Decision velocity spiked ${Math.round(velocityDelta)}% above baseline`,
      affectedPairCount: pairIds.size,
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  if (avgEscalationRate > 0.5 && totalDecisions >= 5) {
    networkAnomalies.push({
      id: `anomaly_escalation_${Date.now()}`,
      type: "escalation_surge",
      severity: "high",
      description: `Escalation rate at ${Math.round(avgEscalationRate * 100)}% — majority of decisions being escalated`,
      affectedPairCount: pairIds.size,
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  if (totalDecisions === 0 && totalPairs > 3) {
    networkAnomalies.push({
      id: `anomaly_silence_${Date.now()}`,
      type: "silence",
      severity: "low",
      description: `No decisions in the last ${window}. Network is quiet.`,
      affectedPairCount: 0,
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  return {
    computedAt: new Date().toISOString(),
    window,
    totalDecisions,
    totalEscalations,
    totalApprovals,
    totalIgnores,
    activePairs: pairIds.size,
    totalPairs,
    decisionsPerHour,
    velocityTrend,
    velocityDelta,
    networkRiskPosture,
    avgApprovalRate,
    avgEscalationRate,
    consensusStrength,
    trendingSignals,
    activeConvergences,
    activeGroups,
    networkAnomalies,
  };
}
