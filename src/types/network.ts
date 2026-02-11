// src/types/network.ts
// Network-effect layer types — where value emerges from the collective

import type { NetworkActivity, GovernanceFingerprintSummary, PublicPairInfo } from './social';

// ─── Emergent Groups ────────────────────────────────────────
// Auto-detected clusters of aligned pairs. Users can claim,
// name, and enrich them — but the platform finds them first.

export interface EmergentGroup {
  id: string;
  name: string;                  // auto-generated, editable by members
  description: string;
  slug: string;                  // URL-safe identifier

  // Membership
  memberPairIds: string[];
  memberCount: number;
  founderPairId?: string;        // who claimed/created it (if claimed)
  isClaimed: boolean;            // false = auto-detected, true = claimed by a member

  // What defines this group
  sharedDomains: string[];       // context domains all members track
  sharedPatterns: string[];      // governance behaviors in common
  sharedSources: SharedSource[]; // repos/feeds monitored by 50%+ of members
  collectiveFingerprint: GroupFingerprint;

  // Activity
  activityCount: number;         // total network activities from members
  lastActivityAt: string;
  trending: boolean;             // had spike in activity recently

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface SharedSource {
  name: string;
  type: 'github_repo' | 'rss_feed' | 'moltbook_topic' | 'news';
  trackedByCount: number;        // how many group members track this
  trackedByPercent: number;      // what % of the group
}

export interface GroupFingerprint {
  avgApprovalRate: number;
  avgEscalationRate: number;
  dominantVelocity: 'fast' | 'deliberate' | 'batched';
  dominantAutonomy: 'tight' | 'moderate' | 'loose';
  dominantRisk: 'conservative' | 'moderate' | 'aggressive';
  peakHours: number[];           // hours where most members are active
  summary: string;               // natural language: "Fast-moving operators with tight oversight, focused on AI infrastructure"
}

export interface GroupMembership {
  groupId: string;
  pairId: string;
  role: 'member' | 'moderator';  // no admin — groups are flat
  joinedAt: string;
  joinReason: 'auto_detected' | 'invited' | 'requested';
}

// ─── Signal Convergence ─────────────────────────────────────
// The killer feature. When multiple pairs in your network
// react to the same signal, the platform surfaces it.
// "3 pairs in your network escalated this CVE."
// "5 operators you're aligned with started tracking this repo."

export interface SignalConvergence {
  id: string;
  type: ConvergenceType;
  strength: number;              // 0-1, how notable this convergence is

  // What converged
  signalKey: string;             // normalized key: "repo:vercel/next.js", "cve:CVE-2026-1234", "topic:agent-marketplace"
  signalLabel: string;           // human-readable: "vercel/next.js", "CVE-2026-1234"
  signalCategory: string;        // "repository", "vulnerability", "topic", "news", "anomaly"

  // Who converged
  convergingPairIds: string[];
  convergingPairs: ConvergencePair[];
  totalPairs: number;

  // How they converged (what actions aligned)
  actions: ConvergenceAction[];

  // Temporal
  firstOccurrence: string;       // when the first pair acted on this
  lastOccurrence: string;        // when the most recent pair acted
  velocityPerHour: number;       // how fast pairs are converging on this
  window: 'hour' | 'day' | 'week';

  // For the viewer
  relevanceToViewer: number;     // 0-1, based on viewer's own context + alignment with converging pairs
  viewerHasActed: boolean;       // has the viewer already acted on this signal?

  createdAt: string;
}

export type ConvergenceType =
  | 'escalation_cluster'    // multiple pairs escalated the same thing
  | 'tracking_wave'         // multiple pairs started tracking the same source
  | 'decision_alignment'    // multiple pairs made the same decision on related items
  | 'anomaly_consensus'     // multiple agents flagged the same anomaly
  | 'context_convergence';  // multiple pairs added the same context source

export interface ConvergencePair {
  pairId: string;
  pairName: string;
  action: string;          // "escalated", "started tracking", "approved", "flagged"
  actionAt: string;
  alignmentWithViewer?: number;
}

export interface ConvergenceAction {
  action: string;          // "escalate", "approve", "track", "flag"
  count: number;           // how many pairs took this action
  percentage: number;      // what % of converging pairs
}

// ─── Network Pulse ──────────────────────────────────────────
// The collective heartbeat of the network.
// What's trending, what's being escalated, how fast
// the network is moving, collective risk posture.

export interface NetworkPulse {
  // Snapshot timestamp
  computedAt: string;
  window: 'hour' | 'day' | 'week';

  // Activity volume
  totalDecisions: number;
  totalEscalations: number;
  totalApprovals: number;
  totalIgnores: number;
  activePairs: number;
  totalPairs: number;

  // Velocity
  decisionsPerHour: number;
  velocityTrend: 'accelerating' | 'steady' | 'slowing';
  velocityDelta: number;         // % change from previous window

  // Collective posture
  networkRiskPosture: 'conservative' | 'moderate' | 'aggressive';
  avgApprovalRate: number;
  avgEscalationRate: number;
  consensusStrength: number;     // 0-1, how aligned the network is overall

  // Trending signals
  trendingSignals: TrendingSignal[];

  // Hot convergences
  activeConvergences: SignalConvergence[];

  // Top groups by activity
  activeGroups: { groupId: string; name: string; activityCount: number }[];

  // Anomalies
  networkAnomalies: NetworkAnomaly[];
}

export interface TrendingSignal {
  key: string;                   // "repo:vercel/next.js"
  label: string;
  category: string;
  mentionCount: number;          // how many activities reference this
  uniquePairs: number;           // how many distinct pairs
  trend: 'rising' | 'stable' | 'falling';
  firstSeen: string;
  velocity: number;              // mentions per hour
}

export interface NetworkAnomaly {
  id: string;
  type: 'velocity_spike' | 'escalation_surge' | 'mass_tracking' | 'consensus_break' | 'silence';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedPairCount: number;
  detectedAt: string;
  resolved: boolean;
}

// ─── Collaborative Decision Pools ───────────────────────────
// Groups can create shared decision queues where members
// contribute and vote on decisions collectively.

export interface DecisionPool {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'resolved';

  // The decision
  item: DecisionPoolItem;
  votes: DecisionVote[];
  outcome?: DecisionOutcome;

  // Thresholds
  quorum: number;                // minimum votes to resolve
  consensusThreshold: number;    // 0-1, what % agreement needed

  createdBy: string;             // pairId
  createdAt: string;
  closedAt?: string;
}

export interface DecisionPoolItem {
  title: string;
  context: string;               // why this matters
  options: string[];             // e.g. ["Approve integration", "Defer to next sprint", "Reject"]
  sourceUrl?: string;
  sourceType?: string;           // "github_issue", "cve", "moltbook_thread"
}

export interface DecisionVote {
  pairId: string;
  choiceIndex: number;           // index into options array
  reasoning?: string;            // why they chose this
  votedAt: string;
}

export interface DecisionOutcome {
  winningChoiceIndex: number;
  winningChoice: string;
  voteCount: number;
  consensusReached: boolean;
  resolvedAt: string;
}

// ─── Network Feed Enhancements ──────────────────────────────

export interface EnrichedFeedItem {
  activity: NetworkActivity;
  convergence?: {                // "2 others also escalated this"
    count: number;
    pairNames: string[];
    convergenceId: string;
  };
  groupContext?: {               // "From your group: AI Infrastructure Operators"
    groupId: string;
    groupName: string;
  };
}
