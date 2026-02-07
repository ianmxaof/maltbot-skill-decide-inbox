/**
 * Moltbook collective logic (Phase 3 stubs).
 * Consensus: keyword/topic frequency → consensus signal.
 * Anomaly: per-agent topic distribution vs collective mean (KL-divergence) → outlier signal.
 * Propagation: same phrase/URL across agents in T hours → propagation signal.
 * Stubs return empty or mock data until wired to real Moltbook feed.
 */

import type { CrossDomainSignal, SynchronicitySignal, NegativeSpaceSignal } from "@/types/governance";
import type { SignalFeedCard } from "@/types/dashboard";

/** Stub: extract consensus topics from posts. Real impl: keyword frequency or embed + cluster. */
export async function getConsensusSignals(_posts: unknown[]): Promise<SignalFeedCard[]> {
  return [];
}

/** Stub: agents with high KL-divergence from collective topic distribution. Real impl: topic dist per agent, compare to mean. */
export async function getAnomalySignals(_posts: unknown[]): Promise<SignalFeedCard[]> {
  return [];
}

/** Stub: phrases/URLs appearing in N agents within T hours. Real impl: track items, count spread. */
export async function getPropagationSignals(_posts: unknown[]): Promise<SignalFeedCard[]> {
  return [];
}

/** Stub: cross-domain pattern (e.g. Moltbook + GitHub). Needs at least two domains. */
export async function getCrossDomainSignals(): Promise<CrossDomainSignal[]> {
  return [];
}

/** Stub: synchronicity — same concept appearing across sources. */
export async function getSynchronicitySignals(): Promise<SynchronicitySignal[]> {
  return [];
}

/** Stub: negative space — topics with fewer mentions than expected (underexplored). */
export async function getNegativeSpaceSignals(): Promise<NegativeSpaceSignal[]> {
  return [];
}

/** Convert a NegativeSpaceSignal to a SignalFeedCard for the feed UI. */
export function negativeSpaceToFeedCard(s: NegativeSpaceSignal, id: string): SignalFeedCard {
  return {
    id,
    name: `Negative space: ${s.topic}`,
    source: "moltbook",
    layer: 3,
    sourceType: "negative_space",
    signalStrength: Math.min(100, Math.max(0, s.gap * 10)),
    lastDelta: `Gap ${s.gap} (expected ${s.expectedMentions}, actual ${s.actualMentions})`,
    whyItMatters: s.hypothesis ?? "Underexplored topic; may be opportunity.",
    confidence: 0.5,
    lastFetchedAt: new Date().toISOString(),
  };
}

/** Convert a SynchronicitySignal to a SignalFeedCard for the feed UI. */
export function synchronicityToFeedCard(s: SynchronicitySignal, id: string): SignalFeedCard {
  return {
    id,
    name: `Synchronicity: ${s.concept}`,
    source: "api",
    layer: 3,
    sourceType: "synchronicity",
    signalStrength: Math.min(100, s.unusualnessScore * 100),
    lastDelta: `${s.occurrences.length} occurrences across sources`,
    whyItMatters: "Unusual clustering of concept; may indicate emerging trend.",
    confidence: Math.min(1, s.unusualnessScore),
    lastFetchedAt: new Date().toISOString(),
  };
}

/** Convert a CrossDomainSignal to a SignalFeedCard for the feed UI. */
export function crossDomainToFeedCard(s: CrossDomainSignal, id: string): SignalFeedCard {
  return {
    id,
    name: `Cross-domain: ${s.pattern}`,
    source: "api",
    layer: 3,
    sourceType: "cross_domain",
    signalStrength: Math.min(100, s.correlation * 100),
    lastDelta: s.domains.join(", "),
    whyItMatters: s.interpretation ?? "Pattern spans multiple domains.",
    confidence: s.correlation,
    lastFetchedAt: new Date().toISOString(),
  };
}
