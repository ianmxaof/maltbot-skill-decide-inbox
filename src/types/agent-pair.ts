/**
 * The Nightly Build — Agent-human pair and activity feed types.
 */

export type OperatingPhilosophy =
  | "ship-while-sleep"
  | "review-before-deploy"
  | "collaborative"
  | "research-only";

export type Visibility = "public" | "unlisted" | "private";

export interface ContextSources {
  githubRepos: string[];
  githubUsers: string[];
  rssUrls: string[];
  moltbookTopics: string[];
}

export interface AgentHumanPair {
  id: string;
  humanName: string;
  agentName: string;
  agentPowerCoreId?: string;
  operatingPhilosophy: OperatingPhilosophy;
  autonomyTiers: { tier1: string[]; tier2: string[]; tier3: string[] };
  trustMetrics: {
    shipRevertRatio: number;
    meanTimeBetweenInterventions: number;
    autonomyExpansionHistory: Array<{ timestamp: string; domain: string; tier: number }>;
  };
  recentAutonomousActions: Array<{
    timestamp: string;
    action: string;
    reasoning: string;
    outcome: "kept" | "reverted" | "modified";
    rollbackCommand?: string;
  }>;
  activityPattern: {
    nightlyBuildSchedule?: string;
    heartbeatIntervalMinutes?: number;
    proactiveVsReactive: number;
  };
  humanPreferences: {
    communicationDensity: "summaries" | "detailed" | "minimal";
    approvalRequirements: string[];
    riskTolerance: "high" | "medium" | "low";
    preferredDeference?: string;
  };
  valueCreated: {
    timeSaved: number;
    frictionPointsRemoved: number;
    projectsShippedAutonomously: number;
  };
  publicNarrative?: string;
  soulMd?: string;
  visibility: Visibility;
  contextSources: ContextSources;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFeedItem {
  id: string;
  pairId: string;
  timestamp: string;
  action: string;
  reasoning: string;
  outcome?: "kept" | "reverted" | "modified";
  tags: string[];
}
