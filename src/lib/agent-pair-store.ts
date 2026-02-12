/**
 * Agent-human pair store — The Nightly Build.
 * Persists to .data/agent-pairs.json (gitignored).
 * Multi-pair from day one; getActivePairId() returns current pair for operator.
 */

import { kv } from "@/lib/db";
import type { AgentHumanPair, ContextSources } from "@/types/agent-pair";
import { getOperatorId } from "@/lib/operator";

const STORE_VERSION = 1;

type PairsFile = {
  pairs: AgentHumanPair[];
  version: number;
};

const SEED_MOCK_PAIRS = process.env.SEED_MOCK_PAIRS === "true";

async function readPairsFile(): Promise<PairsFile> {
  try {
    const data = await kv.get<PairsFile>("agent-pairs");
    if (!data) {
      const file: PairsFile = { pairs: [], version: STORE_VERSION };
      if (SEED_MOCK_PAIRS) {
        file.pairs = createSeedPairs();
        await writePairsFile(file);
      }
      return file;
    }
    const pairs = data?.pairs ? data.pairs : [];
    if (SEED_MOCK_PAIRS && pairs.length === 0) {
      const file: PairsFile = { pairs: createSeedPairs(), version: STORE_VERSION };
      await writePairsFile(file);
      return file;
    }
    return { pairs, version: data?.version ?? STORE_VERSION };
  } catch {
    return { pairs: [], version: STORE_VERSION };
  }
}

function createSeedPairs(): AgentHumanPair[] {
  const now = new Date().toISOString();
  const base = (id: string, human: string, agent: string, philosophy: AgentHumanPair["operatingPhilosophy"]) => ({
    id,
    humanName: human,
    agentName: agent,
    operatingPhilosophy: philosophy,
    autonomyTiers: { tier1: [], tier2: [], tier3: [] },
    trustMetrics: defaultTrustMetrics(),
    recentAutonomousActions: [],
    activityPattern: { heartbeatIntervalMinutes: 30, proactiveVsReactive: 0.5 },
    humanPreferences: { communicationDensity: "summaries" as const, approvalRequirements: [], riskTolerance: "medium" as const },
    valueCreated: defaultValueCreated(),
    visibility: "public" as const,
    contextSources: DEFAULT_CONTEXT,
    createdAt: now,
    updatedAt: now,
  });
  return [
    { ...base("pair_1", "Alex", "Claude", "ship-while-sleep"), trustMetrics: { ...defaultTrustMetrics(), shipRevertRatio: 0.94 } },
    { ...base("pair_2", "Jordan", "GPT-4", "review-before-deploy"), trustMetrics: { ...defaultTrustMetrics(), shipRevertRatio: 0.88 } },
    { ...base("pair_3", "Sam", "Claude", "collaborative"), trustMetrics: { ...defaultTrustMetrics(), shipRevertRatio: 0.91 } },
  ];
}

async function writePairsFile(data: PairsFile): Promise<void> {
  await kv.set("agent-pairs", data);
}

function nextId(): string {
  return `pair_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_CONTEXT: ContextSources = {
  githubRepos: [],
  githubUsers: [],
  rssUrls: [],
  moltbookTopics: [],
};

function defaultTrustMetrics() {
  return {
    shipRevertRatio: 0,
    meanTimeBetweenInterventions: 0,
    autonomyExpansionHistory: [] as Array<{ timestamp: string; domain: string; tier: number }>,
  };
}

function defaultValueCreated() {
  return {
    timeSaved: 0,
    frictionPointsRemoved: 0,
    projectsShippedAutonomously: 0,
  };
}

/**
 * Get the active pair ID for the current operator.
 * Reads from active-pair key or defaults to pair_1.
 */
export async function getActivePairId(): Promise<string> {
  try {
    const data = await kv.get<{ pairId?: string; operatorId?: string }>("active-pair");
    if (data && typeof data.pairId === "string" && data.pairId.trim()) {
      return data.pairId.trim();
    }
  } catch {
    // fall through
  }
  return "pair_1";
}

/**
 * Set the active pair for the current operator.
 */
export async function setActivePairId(pairId: string): Promise<void> {
  const data = {
    pairId,
    operatorId: getOperatorId(),
    updatedAt: new Date().toISOString(),
  };
  await kv.set("active-pair", data);
}

/**
 * Get the active pair for the current operator.
 */
export async function getPair(): Promise<AgentHumanPair | null> {
  const pairId = await getActivePairId();
  return getPairById(pairId);
}

export async function getPairById(id: string): Promise<AgentHumanPair | null> {
  const { pairs } = await readPairsFile();
  return pairs.find((p) => p.id === id) ?? null;
}

export async function getPublicPairs(): Promise<AgentHumanPair[]> {
  const { pairs } = await readPairsFile();
  return pairs.filter((p) => p.visibility === "public" || p.visibility === "unlisted");
}

export type CreatePairInput = Omit<
  AgentHumanPair,
  "id" | "createdAt" | "updatedAt" | "trustMetrics" | "recentAutonomousActions" | "valueCreated"
> & {
  id?: string;
  trustMetrics?: AgentHumanPair["trustMetrics"];
  recentAutonomousActions?: AgentHumanPair["recentAutonomousActions"];
  valueCreated?: AgentHumanPair["valueCreated"];
};

export async function createPair(input: CreatePairInput): Promise<AgentHumanPair> {
  const now = new Date().toISOString();
  const pair: AgentHumanPair = {
    id: input.id ?? nextId(),
    humanName: input.humanName.trim(),
    agentName: input.agentName.trim(),
    agentPowerCoreId: input.agentPowerCoreId,
    operatingPhilosophy: input.operatingPhilosophy,
    autonomyTiers: input.autonomyTiers ?? {
      tier1: ["file organization", "research & drafts", "memory maintenance"],
      tier2: ["code changes", "documentation updates"],
      tier3: ["public posts", "financial decisions", "external communications"],
    },
    trustMetrics: input.trustMetrics ?? defaultTrustMetrics(),
    recentAutonomousActions: input.recentAutonomousActions ?? [],
    activityPattern: input.activityPattern ?? {
      heartbeatIntervalMinutes: 30,
      proactiveVsReactive: 0.5,
    },
    humanPreferences: input.humanPreferences ?? {
      communicationDensity: "summaries",
      approvalRequirements: [],
      riskTolerance: "medium",
    },
    valueCreated: input.valueCreated ?? defaultValueCreated(),
    publicNarrative: input.publicNarrative,
    soulMd: input.soulMd,
    visibility: input.visibility ?? "private",
    contextSources: input.contextSources ?? { ...DEFAULT_CONTEXT },
    createdAt: now,
    updatedAt: now,
  };
  const file = await readPairsFile();
  file.pairs.push(pair);
  file.version = STORE_VERSION;
  await writePairsFile(file);
  return pair;
}

export type UpdatePairInput = Partial<Omit<AgentHumanPair, "id" | "createdAt">>;

export async function updatePair(id: string, input: UpdatePairInput): Promise<AgentHumanPair | null> {
  const file = await readPairsFile();
  const idx = file.pairs.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const existing = file.pairs[idx];
  const updated: AgentHumanPair = {
    ...existing,
    ...input,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  file.pairs[idx] = updated;
  file.version = STORE_VERSION;
  await writePairsFile(file);
  return updated;
}

export async function recordAction(
  pairId: string,
  action: string,
  outcome: "kept" | "reverted" | "modified",
  reasoning?: string
): Promise<void> {
  const pair = await getPairById(pairId);
  if (!pair) return;

  pair.recentAutonomousActions.unshift({
    timestamp: new Date().toISOString(),
    action,
    reasoning: reasoning ?? "",
    outcome,
  });
  pair.recentAutonomousActions = pair.recentAutonomousActions.slice(0, 50);

  const total = pair.recentAutonomousActions.length;
  const kept = pair.recentAutonomousActions.filter((a) => a.outcome === "kept").length;
  pair.trustMetrics.shipRevertRatio = total > 0 ? kept / total : 0;

  pair.updatedAt = new Date().toISOString();
  await updatePair(pairId, pair);
}

export async function listPairs(): Promise<AgentHumanPair[]> {
  const { pairs } = await readPairsFile();
  return pairs;
}
