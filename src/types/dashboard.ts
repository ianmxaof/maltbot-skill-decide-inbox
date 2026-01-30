/**
 * Types for dashboard tabs: Feeds, Decide, Security, Timeline, Radar, Skills.
 */

// --- Signal Feeds (first-class, ranked, explainable) ---
export type SignalFeedCard = {
  id: string;
  name: string;
  source: "github" | "reddit" | "x" | "rss" | "api" | "docs";
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

// --- Decide Inbox (human bottleneck) ---
export type DecideOption = {
  id: string;
  label: string;
  summary: string;
};

export type DecideInboxItem = {
  id: string;
  projectId?: string;
  /** What changed */
  whatChanged: string;
  /** Why it matters */
  whyItMatters: string;
  options: DecideOption[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendation: string;
  at: string;
  status: "pending" | "approved" | "ignored" | "deeper";
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
