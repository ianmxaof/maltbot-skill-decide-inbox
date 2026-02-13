// src/types/social.ts
// Social layer types for The Nightly Build

// ─── Visibility ─────────────────────────────────────────────

export type VisibilityLevel = 'private' | 'public' | 'network';

export interface VisibilitySettings {
  pairId: string;
  contextSources: VisibilityLevel;
  decisionPatterns: VisibilityLevel;
  agentConfig: VisibilityLevel;
  activityFeed: VisibilityLevel;
  governanceFingerprint: 'private' | 'public'; // never 'network' — it's all or nothing
  signalFeeds: VisibilityLevel;
  skills: 'private' | 'public';
  updatedAt: string;
}

export const DEFAULT_VISIBILITY: Omit<VisibilitySettings, 'pairId' | 'updatedAt'> = {
  contextSources: 'private',
  decisionPatterns: 'private',
  agentConfig: 'private',
  activityFeed: 'private',
  governanceFingerprint: 'private',
  signalFeeds: 'private',
  skills: 'private',
};

// ─── Space Theme (MySpace Layer) ────────────────────────────

export type SpaceLayout = 'default' | 'minimal' | 'dense' | 'editorial';
export type BackgroundStyle = 'dark' | 'light' | 'gradient' | 'custom';

export interface SpaceTheme {
  pairId: string;
  accentColor: string;
  backgroundStyle: BackgroundStyle;
  gradientFrom?: string;
  gradientTo?: string;
  headerImage?: string;
  layout: SpaceLayout;
  tagline: string;
  bioMarkdown: string;
  /** MySpace-style bulletin: short message visible on your Space and in network feed */
  bulletin: string;
  bulletinUpdatedAt?: string;
  pinnedContextIds: string[];
  featuredDecisionIds: string[];
  customSections: CustomSection[];
  updatedAt: string;
}

export interface CustomSection {
  id: string;
  title: string;
  type: 'markdown' | 'embed' | 'links' | 'showcase';
  content: string;
  position: number;
}

export const DEFAULT_THEME: Omit<SpaceTheme, 'pairId' | 'updatedAt'> = {
  accentColor: '#6366f1',
  backgroundStyle: 'dark',
  layout: 'default',
  tagline: '',
  bioMarkdown: '',
  bulletin: '',
  pinnedContextIds: [],
  featuredDecisionIds: [],
  customSections: [],
};

// ─── Social Graph ───────────────────────────────────────────

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface AlignmentScore {
  pairAId: string;
  pairBId: string;
  score: number; // 0-1
  dimensions: AlignmentDimensions;
  computedAt: string;
}

export interface AlignmentDimensions {
  contextOverlap: number;     // shared sources/repos/feeds
  decisionSimilarity: number; // approve/ignore/escalate correlation
  signalAlignment: number;    // similar escalation triggers
  temporalSync: number;       // active at similar times
}

// ─── Network Activity Feed ──────────────────────────────────

export type NetworkActivityType =
  | 'decision'
  | 'signal'
  | 'agent_action'
  | 'context_change'
  | 'milestone'
  | 'space_update';

export interface NetworkActivity {
  id: string;
  pairId: string;
  type: NetworkActivityType;
  summary: string;
  detail?: string;
  visibility: 'public' | 'network';
  createdAt: string;
  sourceEventId?: string;
}

// ─── Enhanced Governance Fingerprint ────────────────────────

export interface GovernanceFingerprint {
  pairId: string;

  // Decision patterns (already computed in existing code)
  approvalRate: number;
  escalationRate: number;
  ignoreRate: number;
  avgResponseTimeMs: number;
  totalDecisions: number;

  // Context profile
  topDomains: string[];
  repoLanguages: string[];
  feedCategories: string[];
  trackedRepoCount: number;
  trackedFeedCount: number;

  // Agent governance style
  agentAutonomy: 'tight' | 'moderate' | 'loose';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  focusAreas: string[];

  // Temporal patterns
  activeHours: number[]; // 0-23, hours with activity
  decisionVelocity: 'fast' | 'deliberate' | 'batched';
  peakDay: string; // day of week with most activity

  computedAt: string;
}

// ─── Public Space (what visitors see) ───────────────────────

export interface PublicSpace {
  pair: PublicPairInfo;
  theme: SpaceTheme;
  visibility: VisibilitySettings;
  fingerprint?: GovernanceFingerprintSummary; // natural language, never raw
  recentActivity: NetworkActivity[];
  contextSources?: PublicContextSource[];
  agentInfo?: PublicAgentInfo;
  skills?: PublicSkillInfo[];
  alignmentWithViewer?: AlignmentScore; // only if viewer is logged in
}

export interface PublicPairInfo {
  id: string;
  humanName: string;
  agentName: string;
  tagline: string;
  avatarUrl?: string;
  createdAt: string;
  followerCount: number;
  isFollowedByViewer: boolean;
}

export interface GovernanceFingerprintSummary {
  // Natural language descriptions, not raw numbers
  style: string;        // "Deliberate operator with tight agent oversight"
  focus: string;        // "Tracks AI infrastructure and frontend tooling"
  pattern: string;      // "Batches decisions, high approval rate, conservative risk"
  activeWindow: string; // "Most active late evenings PST"
}

export interface PublicContextSource {
  id: string;
  type: 'github_repo' | 'rss_feed' | 'moltbook_topic' | 'news' | 'custom';
  name: string;
  url?: string;
  category: string;
}

export interface PublicAgentInfo {
  name: string;
  personality: string;
  mode: string;
  capabilities: string[];
  lastHeartbeat?: string;
}

export interface PublicSkillInfo {
  name: string;
  description: string;
  installedAt: string;
}

// ─── Discover / Alignment ───────────────────────────────────

export interface DiscoverResult {
  pair: PublicPairInfo;
  theme: Pick<SpaceTheme, 'accentColor' | 'tagline' | 'layout'>;
  fingerprint?: GovernanceFingerprintSummary;
  alignmentScore?: number;
  alignmentReason?: string; // "You both track similar AI repos and approve aggressively"
}

export interface EmergentGroup {
  id: string;
  name: string;          // auto-generated: "AI Infrastructure Operators"
  description: string;
  memberCount: number;
  topMembers: PublicPairInfo[];
  sharedDomains: string[];
  sharedPatterns: string[];
  strength: number; // 0-1, how tightly aligned the group is
}
