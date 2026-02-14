/**
 * Integration Types — The Nightly Build
 *
 * Defines the contract for platform integrations.
 * Each integration is both a profile display widget AND a context source for the agent.
 */

// ─── Provider Identity ──────────────────────────────────────

export type IntegrationProviderId =
  | 'hackernews'
  | 'spotify'
  | 'github_profile'
  | 'reddit'
  | 'bluesky'
  | 'mastodon'
  | 'pocket'
  | 'readwise'
  | 'discord';

export type AuthMethod = 'none' | 'username' | 'api_key' | 'oauth2';

export interface IntegrationProvider {
  id: IntegrationProviderId;
  name: string;
  description: string;
  icon: string;                    // Lucide icon name
  color: string;                   // Brand accent color
  authMethod: AuthMethod;
  /** Fields the user needs to provide to connect */
  connectionFields: ConnectionField[];
  /** What data this integration provides */
  capabilities: IntegrationCapability[];
  /** Whether this integration can feed signals to the agent */
  feedsSignals: boolean;
  /** Whether this integration has a profile widget */
  hasWidget: boolean;
}

export interface ConnectionField {
  key: string;
  label: string;
  type: 'text' | 'url' | 'password';
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export type IntegrationCapability =
  | 'profile_widget'    // shows data on the Space page
  | 'signal_feed'       // feeds items into the agent's signal pipeline
  | 'now_playing'       // real-time "now" status (music, activity)
  | 'activity_history'  // historical activity data
  | 'social_graph'      // follows/friends/connections data
  | 'content_feed';     // articles/posts/saves

// ─── Connected Account ──────────────────────────────────────

export interface ConnectedIntegration {
  id: string;
  pairId: string;
  providerId: IntegrationProviderId;
  /** Display name (e.g. HN username, Spotify display name) */
  displayName: string;
  /** Provider-specific connection data (username, tokens, etc.) */
  connectionData: Record<string, string>;
  /** Whether this integration is active and feeding data */
  active: boolean;
  /** Show on profile */
  showOnProfile: boolean;
  /** Last time data was successfully fetched */
  lastSyncAt?: string;
  /** Any sync error message */
  lastError?: string;
  connectedAt: string;
  updatedAt: string;
}

// ─── Integration Data (what providers return) ───────────────

export interface IntegrationProfileData {
  providerId: IntegrationProviderId;
  /** Rendered on the profile widget */
  widgetData: Record<string, unknown>;
  /** Signal items to feed into the agent pipeline */
  signalItems?: IntegrationSignalItem[];
  fetchedAt: string;
}

export interface IntegrationSignalItem {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  source: string;
  publishedAt: string;
  relevanceHint?: string;
}

// ─── Hacker News Specific ───────────────────────────────────

export interface HNUserProfile {
  id: string;
  karma: number;
  created: number;      // Unix timestamp
  about?: string;
  submitted: number[];  // story/comment IDs (most recent first)
}

export interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
  score?: number;
  descendants?: number; // comment count
  parent?: number;
  kids?: number[];
}

export interface HNWidgetData {
  username: string;
  karma: number;
  accountAge: string;       // "2 years"
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
}

// ─── Spotify Specific ───────────────────────────────────────

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;       // Unix timestamp in ms
  scope: string;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  track?: {
    id: string;
    name: string;
    artists: string[];
    album: string;
    albumArtUrl?: string;
    durationMs: number;
    progressMs: number;
    previewUrl?: string;
    spotifyUrl: string;
  };
  device?: string;
  timestamp: string;
}

export interface SpotifyTopItem {
  id: string;
  name: string;
  imageUrl?: string;
  spotifyUrl: string;
  /** For tracks: artist names. For artists: genres. */
  subtitle: string;
  popularity: number;
}

export interface SpotifyWidgetData {
  displayName: string;
  profileUrl: string;
  nowPlaying?: SpotifyNowPlaying;
  topArtists: SpotifyTopItem[];
  topTracks: SpotifyTopItem[];
  recentlyPlayed: Array<{
    id: string;
    name: string;
    artists: string[];
    albumArtUrl?: string;
    playedAt: string;
  }>;
}
