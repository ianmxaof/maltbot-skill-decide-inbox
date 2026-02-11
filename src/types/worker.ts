// src/types/worker.ts
// Types for local agent workers that connect to The Nightly Build
//
// Architecture:
//   Worker (runs on local hardware + Ollama)
//     ↕ HTTP
//   Platform (maltbot-ui / The Nightly Build)
//
// Workers pull config, push discoveries, send heartbeats.

// ─── Worker Identity ────────────────────────────────────────

export interface WorkerRegistration {
  id: string;
  pairId: string;
  name: string;
  aspect: WorkerAspect;
  hostname: string;
  platform: string;
  ollamaModel: string;
  ollamaUrl: string;
  capabilities: WorkerCapability[];
  status: WorkerStatus;
  version: string;

  registeredAt: string;
  lastHeartbeatAt: string;
  lastActivityAt?: string;
  configVersion: number;

  totalItemsIngested: number;
  totalDecisionsSurfaced: number;
  uptimeSeconds: number;
  tokensProcessed: number;
}

export type WorkerAspect =
  | "golem"
  | "prometheus"
  | "odin"
  | "hermes"
  | "custom";

export type WorkerStatus =
  | "online"
  | "idle"
  | "working"
  | "offline"
  | "error";

export type WorkerCapability =
  | "web_monitor"
  | "github_monitor"
  | "reddit_monitor"
  | "code_analysis"
  | "text_generation"
  | "image_analysis"
  | "summarization"
  | "classification";

// ─── Worker Configuration ───────────────────────────────────

export interface WorkerConfig {
  workerId: string;
  pairId: string;
  configVersion: number;

  watchers: WatcherConfig[];

  processing: ProcessingConfig;

  platform: PlatformEndpoints;

  heartbeatIntervalMs: number;

  systemPrompt: string;
  evaluationPrompt: string;
}

export interface WatcherConfig {
  id: string;
  type: WatcherType;
  enabled: boolean;
  intervalMs: number;

  config: Record<string, unknown>;

  keywords?: string[];
  excludeKeywords?: string[];
  minRelevanceScore?: number;
}

export type WatcherType =
  | "rss_feed"
  | "github_repo"
  | "github_issues"
  | "github_releases"
  | "reddit_subreddit"
  | "hacker_news"
  | "web_page"
  | "twitter_search"
  | "custom_script";

export interface ProcessingConfig {
  maxConcurrentItems: number;
  batchSize: number;
  cooldownMs: number;
  maxTokensPerCall: number;
  temperature: number;
  retryAttempts: number;
}

export interface PlatformEndpoints {
  baseUrl: string;
  apiKey?: string;
  ingestEndpoint: string;
  heartbeatEndpoint: string;
  configEndpoint: string;
  registerEndpoint: string;
}

// ─── Heartbeat ──────────────────────────────────────────────

export interface WorkerHeartbeat {
  workerId: string;
  status: WorkerStatus;
  timestamp: string;

  activeWatchers: number;
  queueDepth: number;
  currentTask?: string;

  itemsProcessed: number;
  itemsSurfaced: number;
  ollamaCallCount: number;
  tokensUsed: number;
  errors: WorkerError[];

  memoryUsageMb: number;
  ollamaAvailable: boolean;
  ollamaModel: string;
  uptimeSeconds: number;
}

export interface WorkerError {
  timestamp: string;
  source: string;
  message: string;
  recoverable: boolean;
}

// ─── Ingestion ──────────────────────────────────────────────

export interface IngestItem {
  workerId: string;
  pairId: string;

  type: IngestItemType;
  urgency: "low" | "medium" | "high" | "critical";
  confidence: number;

  title: string;
  summary: string;
  detail?: string;
  sourceUrl?: string;
  sourceName: string;
  sourceType: WatcherType;

  suggestedAction?: "approve" | "escalate" | "investigate" | "ignore";
  actionRationale?: string;
  options?: IngestOption[];

  signalKeys: string[];
  tags: string[];

  contentHash: string;
  discoveredAt: string;
}

export type IngestItemType =
  | "opportunity"
  | "threat"
  | "trend"
  | "discussion"
  | "release"
  | "bug"
  | "content_idea"
  | "competitor"
  | "collaboration";

export interface IngestOption {
  label: string;
  description: string;
  risk: "low" | "medium" | "high";
}

// ─── Ingestion Response ─────────────────────────────────────

export interface IngestResponse {
  accepted: boolean;
  itemId?: string;
  reason?: string;
  routedTo: "decide_inbox" | "feed_only" | "dropped";
  feedbackForModel?: string;
}

// ─── Default Configs ────────────────────────────────────────

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  maxConcurrentItems: 3,
  batchSize: 5,
  cooldownMs: 5000,
  maxTokensPerCall: 2048,
  temperature: 0.3,
  retryAttempts: 2,
};

export const DEFAULT_HEARTBEAT_INTERVAL = 60000;

export const ASPECT_SYSTEM_PROMPTS: Record<WorkerAspect, string> = {
  golem: `You are Golem, a tireless worker agent. Your role is to monitor sources, extract noteworthy items, and surface them for human review. You are thorough, literal, and never miss details. You don't make creative leaps — you report what you find faithfully. When evaluating relevance, err on the side of surfacing too much rather than too little. Your human operator will filter.`,

  prometheus: `You are Prometheus, a creative and technical agent. Your role is to analyze code, generate solutions, identify patterns, and create. When you find problems, you think about solutions. When you see trends, you extrapolate where they're heading. You take creative risks but always explain your reasoning. You bias toward action and building.`,

  odin: `You are Odin, a wisdom agent. Your role is to analyze, synthesize, and advise. You see patterns across multiple signals that others miss. When evaluating items, you consider second and third-order effects. You are measured, strategic, and always explain the "why this matters" and "what to do about it." You prioritize signal over noise.`,

  hermes: `You are Hermes, a communication agent. Your role is to craft messages, summarize findings for human audiences, monitor social signals, and bridge between technical and non-technical contexts. You write clearly, concisely, and with awareness of audience. When monitoring social platforms, you focus on engagement patterns and sentiment.`,

  custom: `You are an agent worker for The Nightly Build platform. Your role is to monitor sources, analyze content, and surface noteworthy items for human review. Be thorough and explain your reasoning.`,
};

export const ASPECT_EVALUATION_PROMPTS: Record<WorkerAspect, string> = {
  golem: `Evaluate this item for relevance to the operator's interests. Score 0-1.
Focus on: Does this match their tracked domains? Is this actionable? Is this new information?
Return JSON: { "score": 0.X, "reason": "...", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["..."], "signalKeys": ["..."] }`,

  prometheus: `Evaluate this item for creative/technical opportunity. Score 0-1.
Focus on: Can we build something from this? Does this solve a problem we're tracking? Is there a novel technical approach here?
Return JSON: { "score": 0.X, "reason": "...", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["..."], "signalKeys": ["..."] }`,

  odin: `Evaluate this item for strategic significance. Score 0-1.
Focus on: What are the second-order effects? Does this shift any ongoing dynamics? Is this a leading indicator?
Return JSON: { "score": 0.X, "reason": "...", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["..."], "signalKeys": ["..."] }`,

  hermes: `Evaluate this item for communication/social relevance. Score 0-1.
Focus on: Is there an audience angle? Does this affect community dynamics? Is this content-worthy?
Return JSON: { "score": 0.X, "reason": "...", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["..."], "signalKeys": ["..."] }`,

  custom: `Evaluate this item for relevance. Score 0-1.
Return JSON: { "score": 0.X, "reason": "...", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["..."], "signalKeys": ["..."] }`,
};
