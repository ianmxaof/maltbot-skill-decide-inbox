/**
 * Types for dashboard tabs: Feeds, Decide, Security, Timeline, Radar, Skills, Moltbook.
 */

// --- Signal Feeds (first-class, ranked, explainable) ---
export type SignalFeedCard = {
  id: string;
  name: string;
  source: "github" | "reddit" | "x" | "rss" | "api" | "docs" | "moltbook";
  projectId?: string;
  /** Trend velocity / signal strength 0–100 */
  signalStrength: number;
  /** Last notable delta description */
  lastDelta: string;
  /** Why it matters to this project */
  whyItMatters: string;
  /** 0–1 */
  confidence: number;
  lastFetchedAt: string;
};

// --- Decide Inbox (human bottleneck) — discriminated union ---
export type DecideOption = {
  id: string;
  label: string;
  summary: string;
};

type BaseDecideItem = {
  id: string;
  createdAt: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "ignored" | "deeper";
};

export type ProjectDecision = BaseDecideItem & {
  category: "project";
  projectId?: string;
  whatChanged: string;
  whyItMatters: string;
  options: DecideOption[];
  recommendation: string;
};

export type SocialAction = BaseDecideItem & {
  category: "social";
  actionType: "post" | "comment" | "follow" | "create_submolt" | "dm";
  title: string;
  description: string;
  reasoning: string;
  implications: string[];
  targetSubmolt?: string;
  targetAgent?: string;
  /** Raw params for Moltbook API execution (when from agent proposal) */
  moltbookPayload?: {
    type: "post" | "comment" | "follow" | "create_submolt";
    rosterAgentId?: string;
    submolt?: string;
    title?: string;
    content?: string;
    url?: string;
    postId?: string;
    parentId?: string;
    agentName?: string;
    display_name?: string;
    description?: string;
    name?: string;
  };
};

export type CICRAlert = BaseDecideItem & {
  category: "ci_cr";
  repo?: string;
  alertType: "failure" | "dependency" | "security";
  summary: string;
  suggestedAction: string;
};

export type DecideInboxItem = ProjectDecision | SocialAction | CICRAlert;

// --- Moltbook ---
export type MoltbookAgent = {
  name: string;
  karma: number;
  followers: number;
  following: number;
  lastActive: string;
  status: "claimed" | "pending_claim";
};

export type MoltbookPost = {
  id: string;
  title: string;
  content: string;
  submolt: string;
  author: string;
  authorKarma: number;
  upvotes: number;
  comments: number;
  createdAt: string;
  relevanceScore?: number;
  relevanceReason?: string;
};

export type SocialExposure = {
  projectsMentioned: string[];
  apiEndpoints: { path: string; flagged: boolean }[];
  toolNames: string[];
  humanInfoLeaked: boolean;
  riskScore: "low" | "medium" | "high";
};

export type BehaviorAnomaly = {
  id: string;
  pattern: string;
  description: string;
  participatingAgents: number;
  severity: "info" | "warning" | "critical";
  detectedAt: string;
};

// --- Security Posture ---
export type SecurityPosture = {
  publicExposure: boolean;
  portRiskScore: number; // 0–100, lower = safer
  apiKeys: { id: string; label: string; lastUsedAt?: string }[];
  pluginTrust: { name: string; level: "verified" | "community" | "unknown" }[];
  /** Sanitized "what attacker could see" preview */
  attackerPreview?: string;
};

// --- Agent Timeline (cognition visible) ---
export type AgentTimelineEvent = {
  id: string;
  agentId: string;
  agentName: string;
  projectId?: string;
  kind: "observed" | "hypothesis" | "cross_check" | "proposal" | "awaiting_decision";
  summary: string;
  at: string;
};

// --- CI/CR Radar ---
export type RadarItem = {
  id: string;
  kind: "ci_failure" | "dependency_churn" | "tooling_change" | "automation_opportunity";
  title: string;
  summary: string;
  /** e.g. "Three tools you depend on added X. You could delete 412 lines." */
  impact?: string;
  at: string;
  projectId?: string;
};

// --- Skill Marketplace (reputation layers) ---
export type SkillCard = {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  /** Identity/reputation graph placeholder */
  authorReputation?: "verified" | "community" | "unknown";
  dependencyRiskScore: number; // 0–100, lower = safer
  usageCount?: number;
  /** Estimated rollback time */
  timeToRollback?: string;
  hasDryRun: boolean;
};
