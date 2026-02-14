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
  /** Theme pack preset — applies coordinated colors, fonts, card styles */
  themePack?: ThemePackId;
  /** Font mood override (mono/sans/serif) */
  fontMood?: 'mono' | 'sans' | 'serif';
  /** Card rendering style */
  cardStyle?: 'glass' | 'solid' | 'outlined' | 'none';
  /** Enable accent color glow effects */
  glowEnabled?: boolean;
  /** Optional profile soundtrack (Spotify/YouTube/SoundCloud embed URL) */
  profileSoundtrackUrl?: string;
  tagline: string;
  bioMarkdown: string;
  /** MySpace-style bulletin: short message visible on your Space and in network feed */
  bulletin: string;
  bulletinUpdatedAt?: string;
  pinnedContextIds: string[];
  featuredDecisionIds: string[];
  customSections: CustomSection[];
  /** Profile widgets — draggable cards on the Space page */
  widgets?: ProfileWidget[];
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
  badges?: ProfileBadges;
  milestones?: Milestone[];
  widgetData?: WidgetDataPayload;
  vibeChecks?: VibeCheckSummary;
  guestbook?: GuestbookEntry[];
  questions?: PairQuestion[];
  mutualSignals?: MutualSignalsSummary;       // only if viewer is logged in
  alignmentCircle?: AlignmentCircleNode[];    // top aligned pairs
  topicConstellation?: TopicNode[];
  alignmentWithViewer?: AlignmentScore;       // only if viewer is logged in
}

export interface PublicPairInfo {
  id: string;
  humanName: string;
  agentName: string;
  tagline: string;
  avatarUrl?: string;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  isFollowedByViewer: boolean;
}

// ─── Badges & Achievements ────────────────────────────────

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;        // Lucide icon name
  rarity: BadgeRarity;
  earnedAt: string;
  category: 'streak' | 'volume' | 'speed' | 'social' | 'governance' | 'explorer' | 'milestone';
}

export interface ProfileBadges {
  pairId: string;
  badges: Badge[];
  currentStreak: number;     // consecutive days with decisions
  longestStreak: number;
  totalDecisions: number;
  computedAt: string;
}

// ─── Milestones ────────────────────────────────────────────

export interface Milestone {
  id: string;
  pairId: string;
  type: 'first_decision' | 'first_follow' | 'first_follower' | 'decisions_10' | 'decisions_50'
    | 'decisions_100' | 'decisions_500' | 'streak_7' | 'streak_30' | 'streak_100'
    | 'joined_group' | 'first_signal' | 'context_source_5' | 'context_source_10'
    | 'profile_created' | 'custom';
  title: string;
  description: string;
  icon: string;
  achievedAt: string;
}

// ─── Theme Packs ──────────────────────────────────────────

export type ThemePackId = 'default' | 'terminal' | 'vaporwave' | 'glassmorphism'
  | 'brutalist' | 'midnight' | 'sunset' | 'arctic' | 'neon-tokyo';

export interface ThemePack {
  id: ThemePackId;
  name: string;
  description: string;
  preview: string;            // CSS gradient for preview swatch
  accentColor: string;
  backgroundStyle: BackgroundStyle;
  gradientFrom: string;
  gradientTo: string;
  fontMood: 'mono' | 'sans' | 'serif';
  cardStyle: 'glass' | 'solid' | 'outlined' | 'none';
  glowEnabled: boolean;
}

// ─── Profile Widgets ──────────────────────────────────────

export type WidgetType =
  | 'decision_chart'       // approve/ignore/escalate pie chart
  | 'governance_gauge'     // ship-revert ratio gauge
  | 'agent_uptime'         // agent worker status + uptime
  | 'rss_ticker'           // live RSS feed ticker
  | 'github_heatmap'       // GitHub contribution-style heatmap
  | 'shipped_this_week'    // auto-generated from approved actions
  | 'context_map'          // visual context source display
  | 'reading_list'         // bookmarked/starred signals
  | 'custom_markdown'      // user-defined markdown content
  | 'hackernews'           // connected HN profile widget
  | 'spotify';             // Spotify now playing + taste

export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2';

export interface ProfileWidget {
  id: string;
  type: WidgetType;
  title?: string;          // optional override of default widget title
  size: WidgetSize;
  position: number;        // sort order in grid
  visible: boolean;
  config?: Record<string, unknown>;  // type-specific configuration
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;           // Lucide icon name
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  requiresData: string;   // what data source it reads from
}

/** Data payload delivered to widget components at render time */
export interface WidgetDataPayload {
  decisionChart?: {
    approved: number;
    ignored: number;
    escalated: number;
    total: number;
  };
  governanceGauge?: {
    shipRevertRatio: number;
    riskTolerance: string;
    autonomyLevel: string;
    totalActions: number;
  };
  agentUptime?: {
    status: 'online' | 'idle' | 'offline';
    lastHeartbeat?: string;
    uptimeSince?: string;
    currentTask?: string;
  };
  rssTicker?: Array<{
    id: string;
    title: string;
    source: string;
    url?: string;
    publishedAt: string;
  }>;
  githubHeatmap?: {
    contributions: Array<{ date: string; count: number }>;
    totalContributions: number;
    repos: string[];
  };
  shippedThisWeek?: Array<{
    id: string;
    action: string;
    summary: string;
    shippedAt: string;
  }>;
  contextMap?: Array<{
    type: string;
    name: string;
    category: string;
    signalCount: number;
  }>;
  readingList?: Array<{
    id: string;
    title: string;
    source: string;
    url?: string;
    savedAt: string;
  }>;
  hackernews?: {
    username: string;
    karma: number;
    accountAge: string;
    recentStories: Array<{
      id: number;
      title: string;
      url?: string;
      score: number;
      comments: number;
      postedAt: string;
    }>;
    recentComments: Array<{
      id: number;
      parentTitle?: string;
      text: string;
      postedAt: string;
    }>;
    topStoryScore: number;
    totalSubmissions: number;
  };
  spotify?: {
    displayName: string;
    profileUrl: string;
    nowPlaying?: {
      isPlaying: boolean;
      track?: {
        id: string;
        name: string;
        artists: string[];
        album: string;
        albumArtUrl?: string;
        durationMs: number;
        progressMs: number;
        spotifyUrl: string;
      };
    };
    topArtists: Array<{
      id: string;
      name: string;
      imageUrl?: string;
      spotifyUrl: string;
      subtitle: string;
    }>;
    recentlyPlayed: Array<{
      id: string;
      name: string;
      artists: string[];
      albumArtUrl?: string;
      playedAt: string;
    }>;
  };
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

// ─── Vibe Check (Profile Reactions) ─────────────────────────

export type VibeReaction = 'aligned' | 'interesting' | 'inspiring' | 'chaotic' | 'based' | 'galaxy-brain';

export interface VibeCheck {
  id: string;
  targetPairId: string;    // whose profile is being reacted to
  reactorPairId: string;   // who reacted
  reaction: VibeReaction;
  createdAt: string;
}

export interface VibeCheckSummary {
  targetPairId: string;
  counts: Record<VibeReaction, number>;
  total: number;
  viewerReaction?: VibeReaction;  // what the current viewer sent, if any
}

// ─── Guestbook ──────────────────────────────────────────────

export interface GuestbookEntry {
  id: string;
  targetPairId: string;    // whose profile
  authorPairId: string;    // who wrote it
  authorName: string;      // display name at time of writing
  message: string;         // max 280 chars
  hidden: boolean;         // owner can hide entries
  createdAt: string;
}

// ─── Bookmarks (Saved Signals) ──────────────────────────────

export interface Bookmark {
  id: string;
  pairId: string;
  title: string;
  source: string;
  url?: string;
  sourceType: 'rss' | 'github' | 'moltbook' | 'manual';
  savedAt: string;
}

// ─── Ask This Pair ──────────────────────────────────────────

export type QuestionStatus = 'pending' | 'answered' | 'declined';

export interface PairQuestion {
  id: string;
  targetPairId: string;      // who is being asked
  askerPairId: string;       // who is asking
  askerName: string;         // display name at time of asking
  question: string;          // max 500 chars
  answer?: string;           // max 2000 chars
  status: QuestionStatus;
  public: boolean;           // visible on profile
  createdAt: string;
  answeredAt?: string;
}

// ─── Mutual Signals ─────────────────────────────────────────

export interface MutualSignal {
  type: 'github_repo' | 'github_user' | 'rss_feed' | 'moltbook_topic';
  name: string;
  displayLabel: string;
}

export interface MutualSignalsSummary {
  signals: MutualSignal[];
  totalShared: number;
}

// ─── Alignment Circle ───────────────────────────────────────

export interface AlignmentCircleNode {
  pairId: string;
  name: string;          // "human × agent"
  score: number;         // alignment score 0-1
  accentColor: string;
}

// ─── Topic Constellation ─────────────────────────────────────

export interface TopicNode {
  id: string;
  label: string;
  category: 'code' | 'feed' | 'discussion' | 'focus';
  weight: number;          // 0-1, how central this topic is
  connections: string[];   // IDs of connected topic nodes
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
