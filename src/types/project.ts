/**
 * Context Hub — Project-centric domain model.
 * "Here's my problem space" — not "here's my bot".
 */

export type LinkedRepo = {
  id: string;
  name: string;
  url: string;
  branch?: string;
  lastSyncedAt?: string; // ISO
};

export type LinkedFeed = {
  id: string;
  name: string;
  urlOrSource: string;
  type: "rss" | "api" | "docs" | "moltbook" | "custom";
  lastFetchedAt?: string;
};

export type LinkedAgent = {
  id: string;
  name: string;
  role: string; // e.g. "Research", "Code", "Synthesis"
  lastActiveAt?: string;
};

export type DecisionLogEntry = {
  id: string;
  at: string; // ISO
  title: string;
  summary: string;
  rationale?: string;
  tags?: string[];
};

export type Project = {
  id: string;
  name: string;
  /** Problem space: markdown + diagram placeholders (e.g. mermaid) — ruleset/config the agent follows */
  problemSpaceMarkdown: string;
  /** OpenClaw agent id (e.g. "main") or roster agent id that uses this context */
  primaryAgentId?: string;
  linkedRepos: LinkedRepo[];
  linkedFeeds: LinkedFeed[];
  linkedAgents: LinkedAgent[];
  decisionLog: DecisionLogEntry[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string; // for "idle for N days"
};

/** For "Signal drift detected" — placeholder for future drift detection */
export type SignalDriftWarning = {
  id: string;
  projectId: string;
  kind: "repo" | "feed" | "agent" | "context";
  message: string;
  severity: "info" | "warning" | "critical";
  at: string;
};
