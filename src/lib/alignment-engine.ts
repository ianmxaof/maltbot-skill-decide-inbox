// src/lib/alignment-engine.ts
// Computes governance similarity between pairs based on fingerprints

import {
  AlignmentScore,
  AlignmentDimensions,
  GovernanceFingerprint,
  GovernanceFingerprintSummary,
  EmergentGroup,
} from '@/types/social';
import {
  getAllPublicFingerprints,
  getGovernanceFingerprint,
  setAlignmentScores,
} from './social-store';

// ─── Similarity Functions ───────────────────────────────────

/** Jaccard similarity: |intersection| / |union| */
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

/** Normalized difference: 1 - |a - b| / max(a, b, 1) */
function rateSimilarity(a: number, b: number): number {
  const max = Math.max(a, b, 0.001);
  return 1 - Math.abs(a - b) / max;
}

/** Hour overlap: how many active hours are shared */
function hourOverlap(a: number[], b: number[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const shared = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return shared.length / union.size;
}

// ─── Core Alignment Computation ─────────────────────────────

function computeDimensions(
  a: GovernanceFingerprint,
  b: GovernanceFingerprint
): AlignmentDimensions {
  return {
    contextOverlap: jaccard(
      [...a.topDomains, ...a.feedCategories],
      [...b.topDomains, ...b.feedCategories]
    ),
    decisionSimilarity:
      (rateSimilarity(a.approvalRate, b.approvalRate) +
        rateSimilarity(a.escalationRate, b.escalationRate) +
        rateSimilarity(a.ignoreRate, b.ignoreRate)) /
      3,
    signalAlignment: jaccard(a.focusAreas, b.focusAreas),
    temporalSync: hourOverlap(a.activeHours, b.activeHours),
  };
}

function computeOverallScore(dims: AlignmentDimensions): number {
  // Weighted average — context and decisions matter most
  const weights = {
    contextOverlap: 0.35,
    decisionSimilarity: 0.30,
    signalAlignment: 0.25,
    temporalSync: 0.10,
  };

  return (
    dims.contextOverlap * weights.contextOverlap +
    dims.decisionSimilarity * weights.decisionSimilarity +
    dims.signalAlignment * weights.signalAlignment +
    dims.temporalSync * weights.temporalSync
  );
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Compute alignment scores between a pair and all public pairs.
 * Call this on a schedule (hourly) or when a user visits /network/aligned.
 */
export async function computeAlignmentForPair(
  pairId: string
): Promise<AlignmentScore[]> {
  const myFingerprint = await getGovernanceFingerprint(pairId);
  if (!myFingerprint) return [];

  const publicFingerprints = await getAllPublicFingerprints();
  const scores: AlignmentScore[] = [];

  for (const other of publicFingerprints) {
    if (other.pairId === pairId) continue;

    const dimensions = computeDimensions(myFingerprint, other);
    const score = computeOverallScore(dimensions);

    scores.push({
      pairAId: pairId,
      pairBId: other.pairId,
      score,
      dimensions,
      computedAt: new Date().toISOString(),
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Recompute all alignment scores system-wide.
 * Call this from a cron job.
 */
export async function recomputeAllAlignments(): Promise<number> {
  const fingerprints = await getAllPublicFingerprints();
  const allScores: AlignmentScore[] = [];

  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      const a = fingerprints[i];
      const b = fingerprints[j];
      const dimensions = computeDimensions(a, b);
      const score = computeOverallScore(dimensions);

      allScores.push({
        pairAId: a.pairId,
        pairBId: b.pairId,
        score,
        dimensions,
        computedAt: new Date().toISOString(),
      });
    }
  }

  await setAlignmentScores(allScores);
  return allScores.length;
}

// ─── Fingerprint Summarization ──────────────────────────────

/** Generate natural language summary of a governance fingerprint */
export function summarizeFingerprint(
  fp: GovernanceFingerprint
): GovernanceFingerprintSummary {
  // Style description
  const velocityLabel =
    fp.decisionVelocity === 'fast' ? 'Quick-deciding' :
    fp.decisionVelocity === 'deliberate' ? 'Deliberate' : 'Batch-processing';
  const autonomyLabel =
    fp.agentAutonomy === 'tight' ? 'tight agent oversight' :
    fp.agentAutonomy === 'moderate' ? 'balanced agent autonomy' :
    'loose agent autonomy';
  const style = `${velocityLabel} operator with ${autonomyLabel}`;

  // Focus description
  const domains = fp.topDomains.slice(0, 3);
  const focus = domains.length > 0
    ? `Tracks ${domains.join(', ')}${fp.trackedRepoCount > 0 ? ` across ${fp.trackedRepoCount} repos` : ''}`
    : 'Building their context sources';

  // Pattern description
  const riskLabel =
    fp.riskTolerance === 'conservative' ? 'conservative risk profile' :
    fp.riskTolerance === 'moderate' ? 'moderate risk tolerance' :
    'aggressive risk appetite';
  const approvalDesc =
    fp.approvalRate > 0.7 ? 'high approval rate' :
    fp.approvalRate > 0.4 ? 'selective approvals' :
    'cautious approvals';
  const pattern = `${approvalDesc}, ${riskLabel}, ${fp.totalDecisions} total decisions`;

  // Active window
  const hours = fp.activeHours.sort((a, b) => a - b);
  let activeWindow = 'Variable schedule';
  if (hours.length > 0) {
    const earliest = hours[0];
    const period = earliest < 6 ? 'early mornings' :
      earliest < 12 ? 'mornings' :
      earliest < 17 ? 'afternoons' :
      earliest < 21 ? 'evenings' : 'late nights';
    activeWindow = `Most active ${period}${fp.peakDay ? `, peaks on ${fp.peakDay}` : ''}`;
  }

  return { style, focus, pattern, activeWindow };
}

// ─── Alignment Reason Generation ────────────────────────────

export function generateAlignmentReason(
  dims: AlignmentDimensions,
  fpA: GovernanceFingerprint,
  fpB: GovernanceFingerprint
): string {
  const reasons: string[] = [];

  if (dims.contextOverlap > 0.5) {
    const shared = fpA.topDomains.filter(d => fpB.topDomains.includes(d));
    if (shared.length > 0) {
      reasons.push(`Both track ${shared.slice(0, 2).join(' and ')}`);
    }
  }

  if (dims.decisionSimilarity > 0.7) {
    reasons.push('Similar decision patterns');
  }

  if (dims.signalAlignment > 0.5) {
    const sharedFocus = fpA.focusAreas.filter(f => fpB.focusAreas.includes(f));
    if (sharedFocus.length > 0) {
      reasons.push(`Shared focus on ${sharedFocus[0]}`);
    }
  }

  if (dims.temporalSync > 0.6) {
    reasons.push('Active at similar times');
  }

  if (reasons.length === 0) {
    reasons.push('Overlapping interests and approach');
  }

  return reasons.join(' · ');
}

// ─── Emergent Group Detection ───────────────────────────────

/**
 * Detect clusters of aligned pairs.
 * Simple approach: find pairs where 3+ pairs all have >0.6 alignment with each other.
 */
export async function detectEmergentGroups(
  minGroupSize: number = 3,
  minAlignment: number = 0.6
): Promise<EmergentGroup[]> {
  const fingerprints = await getAllPublicFingerprints();
  if (fingerprints.length < minGroupSize) return [];

  // Build adjacency: who aligns with whom above threshold
  const adjacency = new Map<string, Set<string>>();
  for (const fp of fingerprints) {
    adjacency.set(fp.pairId, new Set());
  }

  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      const dims = computeDimensions(fingerprints[i], fingerprints[j]);
      const score = computeOverallScore(dims);
      if (score >= minAlignment) {
        adjacency.get(fingerprints[i].pairId)!.add(fingerprints[j].pairId);
        adjacency.get(fingerprints[j].pairId)!.add(fingerprints[i].pairId);
      }
    }
  }

  // Find cliques (simplified: greedy clustering)
  const visited = new Set<string>();
  const groups: EmergentGroup[] = [];

  for (const fp of fingerprints) {
    if (visited.has(fp.pairId)) continue;
    const neighbors = adjacency.get(fp.pairId)!;
    if (neighbors.size < minGroupSize - 1) continue;

    // Form cluster from this node and its neighbors
    const cluster = [fp.pairId, ...neighbors].filter(id => !visited.has(id));
    if (cluster.length < minGroupSize) continue;

    // Mark visited
    cluster.forEach(id => visited.add(id));

    // Determine shared characteristics
    const clusterFps = cluster
      .map(id => fingerprints.find(f => f.pairId === id)!)
      .filter(Boolean);

    const allDomains = clusterFps.flatMap(f => f.topDomains);
    const domainCounts = new Map<string, number>();
    allDomains.forEach(d => domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1));
    const sharedDomains = [...domainCounts.entries()]
      .filter(([, count]) => count >= Math.ceil(cluster.length * 0.5))
      .map(([domain]) => domain);

    const sharedPatterns: string[] = [];
    const avgApproval = clusterFps.reduce((s, f) => s + f.approvalRate, 0) / clusterFps.length;
    if (avgApproval > 0.7) sharedPatterns.push('High approval operators');
    if (avgApproval < 0.3) sharedPatterns.push('Cautious operators');

    const groupName = sharedDomains.length > 0
      ? `${sharedDomains.slice(0, 2).map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(' & ')} Operators`
      : `Aligned Group ${groups.length + 1}`;

    groups.push({
      id: `group_${Date.now()}_${groups.length}`,
      name: groupName,
      description: `${cluster.length} pairs with aligned governance patterns`,
      memberCount: cluster.length,
      topMembers: [], // populated when rendering with pair info
      sharedDomains,
      sharedPatterns,
      strength: minAlignment,
    });
  }

  return groups;
}
