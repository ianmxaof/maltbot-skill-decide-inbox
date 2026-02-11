// src/lib/group-engine.ts
// Emergent group detection using BFS clustering on fingerprint similarity.

import type {
  EmergentGroup,
  GroupFingerprint,
  GroupMembership,
  SharedSource,
} from "@/types/network";
import type { GovernanceFingerprint } from "@/types/social";
import { getAllPublicFingerprints } from "./social-store";
import { getGroups, setGroups, getMemberships, setMemberships } from "./network-store";

// ─── Similarity (same as alignment-engine but inlined to avoid circular) ─

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

function rateSimilarity(a: number, b: number): number {
  const max = Math.max(a, b, 0.001);
  return 1 - Math.abs(a - b) / max;
}

function overallSimilarity(a: GovernanceFingerprint, b: GovernanceFingerprint): number {
  const contextOverlap = jaccard(
    [...a.topDomains, ...a.feedCategories],
    [...b.topDomains, ...b.feedCategories]
  );
  const decisionSimilarity =
    (rateSimilarity(a.approvalRate, b.approvalRate) +
      rateSimilarity(a.escalationRate, b.escalationRate) +
      rateSimilarity(a.ignoreRate, b.ignoreRate)) / 3;
  const signalAlignment = jaccard(a.focusAreas, b.focusAreas);

  return contextOverlap * 0.35 + decisionSimilarity * 0.35 + signalAlignment * 0.30;
}

// ─── Slug Generation ────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "group";
}

// ─── Mode (most common value) ───────────────────────────────

function mode<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

// ─── Collective Fingerprint ─────────────────────────────────

function computeGroupFingerprint(
  members: GovernanceFingerprint[]
): GroupFingerprint {
  if (members.length === 0) {
    return {
      avgApprovalRate: 0,
      avgEscalationRate: 0,
      dominantVelocity: "deliberate",
      dominantAutonomy: "moderate",
      dominantRisk: "moderate",
      peakHours: [],
      summary: "New group — governance patterns still forming",
    };
  }

  const avgApprovalRate = members.reduce((s, m) => s + m.approvalRate, 0) / members.length;
  const avgEscalationRate = members.reduce((s, m) => s + m.escalationRate, 0) / members.length;
  const dominantVelocity = mode(members.map((m) => m.decisionVelocity)) ?? "deliberate";
  const dominantAutonomy = mode(members.map((m) => m.agentAutonomy)) ?? "moderate";
  const dominantRisk = mode(members.map((m) => m.riskTolerance)) ?? "moderate";

  // Peak hours: hours that appear in 50%+ of members
  const hourCounts = new Map<number, number>();
  for (const m of members) {
    for (const h of m.activeHours) {
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
  }
  const peakHours = [...hourCounts.entries()]
    .filter(([, c]) => c >= Math.ceil(members.length * 0.5))
    .map(([h]) => h)
    .sort((a, b) => a - b);

  // Shared domains
  const domains = members.flatMap((m) => m.topDomains);
  const domainSet = [...new Set(domains)].slice(0, 3);

  const velocityLabel =
    dominantVelocity === "fast" ? "Fast-moving" :
    dominantVelocity === "deliberate" ? "Deliberate" : "Batch-processing";
  const autonomyLabel =
    dominantAutonomy === "tight" ? "tight oversight" :
    dominantAutonomy === "moderate" ? "balanced autonomy" : "loose autonomy";
  const focusLabel = domainSet.length > 0 ? `, focused on ${domainSet.join(", ")}` : "";

  const summary = `${velocityLabel} operators with ${autonomyLabel}${focusLabel}`;

  return {
    avgApprovalRate,
    avgEscalationRate,
    dominantVelocity,
    dominantAutonomy,
    dominantRisk,
    peakHours,
    summary,
  };
}

// ─── Shared Sources ─────────────────────────────────────────

function computeSharedSources(members: GovernanceFingerprint[]): SharedSource[] {
  // Aggregate domain mentions as proxy for shared sources
  const sourceCounts = new Map<string, { type: SharedSource["type"]; count: number }>();

  for (const m of members) {
    for (const domain of m.topDomains) {
      const existing = sourceCounts.get(domain) ?? { type: "news" as const, count: 0 };
      existing.count++;
      sourceCounts.set(domain, existing);
    }
  }

  return [...sourceCounts.entries()]
    .filter(([, v]) => v.count >= Math.ceil(members.length * 0.5))
    .map(([name, v]) => ({
      name,
      type: v.type,
      trackedByCount: v.count,
      trackedByPercent: Math.round((v.count / members.length) * 100),
    }))
    .sort((a, b) => b.trackedByCount - a.trackedByCount);
}

// ─── Group Detection (BFS clustering) ───────────────────────

/**
 * Detect emergent groups. Call hourly.
 * Uses BFS on the fingerprint similarity adjacency graph.
 */
export async function detectGroups(
  minGroupSize: number = 3,
  minSimilarity: number = 0.55
): Promise<EmergentGroup[]> {
  const fingerprints = await getAllPublicFingerprints();
  if (fingerprints.length < minGroupSize) return [];

  const existingGroups = await getGroups();
  const claimedGroups = existingGroups.filter((g) => g.isClaimed);

  // Build adjacency graph
  const adj = new Map<string, Set<string>>();
  for (const fp of fingerprints) adj.set(fp.pairId, new Set());

  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      const sim = overallSimilarity(fingerprints[i], fingerprints[j]);
      if (sim >= minSimilarity) {
        adj.get(fingerprints[i].pairId)!.add(fingerprints[j].pairId);
        adj.get(fingerprints[j].pairId)!.add(fingerprints[i].pairId);
      }
    }
  }

  // BFS to find connected components
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const fp of fingerprints) {
    if (visited.has(fp.pairId)) continue;
    const neighbors = adj.get(fp.pairId)!;
    if (neighbors.size < minGroupSize - 1) continue;

    const queue = [fp.pairId];
    const cluster: string[] = [];
    visited.add(fp.pairId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (cluster.length >= minGroupSize) {
      clusters.push(cluster);
    }
  }

  // Build groups from clusters
  const fpMap = new Map(fingerprints.map((f) => [f.pairId, f]));
  const now = new Date().toISOString();
  const newGroups: EmergentGroup[] = [];
  const newMemberships: GroupMembership[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const memberIds = clusters[i];
    const memberFps = memberIds.map((id) => fpMap.get(id)!).filter(Boolean);

    const sharedSources = computeSharedSources(memberFps);
    const collectiveFingerprint = computeGroupFingerprint(memberFps);

    // Name from shared domains
    const domainCounts = new Map<string, number>();
    for (const fp of memberFps) {
      for (const d of fp.topDomains) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
    }
    const topDomains = [...domainCounts.entries()]
      .filter(([, c]) => c >= Math.ceil(memberIds.length * 0.5))
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => d);

    const name = topDomains.length > 0
      ? `${topDomains.slice(0, 2).map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(" & ")} Operators`
      : `Aligned Group ${i + 1}`;

    const slug = toSlug(name) + `-${Date.now().toString(36).slice(-4)}`;

    // Shared patterns
    const sharedPatterns: string[] = [];
    if (collectiveFingerprint.avgApprovalRate > 0.7) sharedPatterns.push("High approval rate");
    if (collectiveFingerprint.avgApprovalRate < 0.3) sharedPatterns.push("Cautious operators");
    if (collectiveFingerprint.dominantRisk === "conservative") sharedPatterns.push("Conservative risk stance");
    if (collectiveFingerprint.dominantVelocity === "fast") sharedPatterns.push("Fast decision-making");

    const group: EmergentGroup = {
      id: `group_${Date.now()}_${i}`,
      name,
      description: `${memberIds.length} pairs with aligned governance patterns`,
      slug,
      memberPairIds: memberIds,
      memberCount: memberIds.length,
      isClaimed: false,
      sharedDomains: topDomains,
      sharedPatterns,
      sharedSources,
      collectiveFingerprint,
      activityCount: 0,
      lastActivityAt: now,
      trending: false,
      createdAt: now,
      updatedAt: now,
    };

    newGroups.push(group);

    // Create memberships
    for (const pid of memberIds) {
      newMemberships.push({
        groupId: group.id,
        pairId: pid,
        role: "member",
        joinedAt: now,
        joinReason: "auto_detected",
      });
    }
  }

  // Merge: keep claimed groups, replace auto-detected with new detection
  const finalGroups = [...claimedGroups, ...newGroups];
  await setGroups(finalGroups);

  // Update memberships: keep memberships for claimed groups, replace auto-detected
  const existingMemberships = await getMemberships();
  const claimedGroupIds = new Set(claimedGroups.map((g) => g.id));
  const keptMemberships = existingMemberships.filter((m) => claimedGroupIds.has(m.groupId));
  await setMemberships([...keptMemberships, ...newMemberships]);

  return finalGroups;
}

/**
 * Claim a group: rename, add description, set founder.
 */
export async function claimGroup(
  groupId: string,
  claimerPairId: string,
  name?: string,
  description?: string
): Promise<EmergentGroup | null> {
  const groups = await getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  if (!group.memberPairIds.includes(claimerPairId)) return null;

  group.isClaimed = true;
  group.founderPairId = claimerPairId;
  if (name) {
    group.name = name;
    group.slug = toSlug(name) + `-${Date.now().toString(36).slice(-4)}`;
  }
  if (description) group.description = description;
  group.updatedAt = new Date().toISOString();

  await setGroups(groups);
  return group;
}
