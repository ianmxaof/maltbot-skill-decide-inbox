/**
 * Topic Constellation Builder — The Nightly Build
 *
 * Transforms a pair's context sources and focus areas
 * into a visual constellation map of interconnected topics.
 */

import type { AgentHumanPair } from "@/types/agent-pair";
import type { GovernanceFingerprint } from "@/types/social";
import type { TopicNode } from "@/types/social";

/**
 * Build a topic constellation from a pair's data.
 * Nodes are context sources and focus areas.
 * Connections link related topics (same category, shared parent).
 */
export function buildConstellation(
  pair: AgentHumanPair,
  fingerprint?: GovernanceFingerprint | null
): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nodeIds = new Set<string>();

  // ── Code nodes (GitHub repos) ──
  for (const repo of pair.contextSources.githubRepos ?? []) {
    const id = `repo_${repo}`;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);

    const label = repo.includes("/") ? repo.split("/").pop()! : repo;
    nodes.push({
      id,
      label,
      category: "code",
      weight: 0.8,
      connections: [],
    });
  }

  // ── Code nodes (GitHub users) ──
  for (const user of pair.contextSources.githubUsers ?? []) {
    const id = `user_${user}`;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);

    nodes.push({
      id,
      label: `@${user}`,
      category: "code",
      weight: 0.6,
      connections: [],
    });
  }

  // ── Feed nodes (RSS) ──
  for (const url of pair.contextSources.rssUrls ?? []) {
    let label = url;
    try {
      label = new URL(url).hostname.replace("www.", "");
    } catch { /* use full url */ }

    const id = `feed_${label}`;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);

    nodes.push({
      id,
      label,
      category: "feed",
      weight: 0.7,
      connections: [],
    });
  }

  // ── Discussion nodes (Moltbook topics) ──
  for (const topic of pair.contextSources.moltbookTopics ?? []) {
    const id = `topic_${topic.toLowerCase()}`;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);

    nodes.push({
      id,
      label: topic,
      category: "discussion",
      weight: 0.7,
      connections: [],
    });
  }

  // ── Focus area nodes (from fingerprint) ──
  if (fingerprint) {
    for (const focus of fingerprint.focusAreas ?? []) {
      const id = `focus_${focus.toLowerCase().replace(/\s+/g, "_")}`;
      if (nodeIds.has(id)) continue;
      nodeIds.add(id);

      nodes.push({
        id,
        label: focus,
        category: "focus",
        weight: 0.9,
        connections: [],
      });
    }

    // Top domains as focus nodes too
    for (const domain of fingerprint.topDomains ?? []) {
      const id = `domain_${domain.toLowerCase().replace(/\s+/g, "_")}`;
      if (nodeIds.has(id)) continue;
      nodeIds.add(id);

      nodes.push({
        id,
        label: domain,
        category: "focus",
        weight: 0.85,
        connections: [],
      });
    }
  }

  // ── Build connections ──
  // Connect nodes of the same category
  const byCategory = new Map<string, string[]>();
  for (const node of nodes) {
    const ids = byCategory.get(node.category) ?? [];
    ids.push(node.id);
    byCategory.set(node.category, ids);
  }

  for (const [, ids] of byCategory) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const nodeA = nodes.find(n => n.id === ids[i]);
        const nodeB = nodes.find(n => n.id === ids[j]);
        if (nodeA && nodeB) {
          nodeA.connections.push(nodeB.id);
          nodeB.connections.push(nodeA.id);
        }
      }
    }
  }

  // Connect focus nodes to all other categories (they're the gravitational centers)
  const focusIds = byCategory.get("focus") ?? [];
  for (const focusId of focusIds) {
    const focusNode = nodes.find(n => n.id === focusId);
    if (!focusNode) continue;

    for (const node of nodes) {
      if (node.id === focusId) continue;
      if (node.category === "focus") continue;

      // Connect if labels share words
      const focusWords = new Set(focusNode.label.toLowerCase().split(/[\s\-_\/]+/));
      const nodeWords = node.label.toLowerCase().split(/[\s\-_\/]+/);

      if (nodeWords.some(w => focusWords.has(w) && w.length > 2)) {
        if (!focusNode.connections.includes(node.id)) {
          focusNode.connections.push(node.id);
        }
        if (!node.connections.includes(focusId)) {
          node.connections.push(focusId);
        }
      }
    }
  }

  return nodes;
}
