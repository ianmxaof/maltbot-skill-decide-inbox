/**
 * Integration Provider Registry — The Nightly Build
 *
 * Central registry of all available integration providers.
 * Each provider defines its auth method, connection fields,
 * capabilities, and data fetching logic.
 */

import type { IntegrationProvider, IntegrationProviderId } from "@/types/integration";

// ─── Provider Definitions ───────────────────────────────────

const PROVIDERS: Record<IntegrationProviderId, IntegrationProvider> = {
  hackernews: {
    id: "hackernews",
    name: "Hacker News",
    description: "Show your HN karma, submissions, and activity on your profile",
    icon: "Flame",
    color: "#ff6600",
    authMethod: "username",
    connectionFields: [
      {
        key: "username",
        label: "HN Username",
        type: "text",
        placeholder: "dang",
        required: true,
        helpText: "Your Hacker News username. We'll fetch your public profile data.",
      },
    ],
    capabilities: ["profile_widget", "signal_feed", "activity_history"],
    feedsSignals: true,
    hasWidget: true,
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    description: "Share what you're listening to and your music taste",
    icon: "Music",
    color: "#1DB954",
    authMethod: "oauth2",
    connectionFields: [],   // OAuth — no manual fields
    capabilities: ["profile_widget", "now_playing", "activity_history"],
    feedsSignals: false,
    hasWidget: true,
  },
  github_profile: {
    id: "github_profile",
    name: "GitHub Profile",
    description: "Show your GitHub contributions, pinned repos, and activity",
    icon: "Github",
    color: "#f0f6fc",
    authMethod: "username",
    connectionFields: [
      {
        key: "username",
        label: "GitHub Username",
        type: "text",
        placeholder: "octocat",
        required: true,
      },
    ],
    capabilities: ["profile_widget", "signal_feed", "activity_history"],
    feedsSignals: true,
    hasWidget: true,
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    description: "Show your subreddit activity, karma, and saved posts",
    icon: "MessageSquare",
    color: "#FF4500",
    authMethod: "oauth2",
    connectionFields: [],
    capabilities: ["profile_widget", "signal_feed", "content_feed"],
    feedsSignals: true,
    hasWidget: true,
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    description: "Show your Bluesky posts and social presence",
    icon: "Cloud",
    color: "#0085FF",
    authMethod: "username",
    connectionFields: [
      {
        key: "handle",
        label: "Bluesky Handle",
        type: "text",
        placeholder: "user.bsky.social",
        required: true,
      },
    ],
    capabilities: ["profile_widget", "content_feed", "social_graph"],
    feedsSignals: false,
    hasWidget: true,
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    description: "Show your Mastodon toots and fediverse presence",
    icon: "Globe",
    color: "#6364FF",
    authMethod: "username",
    connectionFields: [
      {
        key: "handle",
        label: "Full Handle",
        type: "text",
        placeholder: "@user@mastodon.social",
        required: true,
      },
    ],
    capabilities: ["profile_widget", "content_feed"],
    feedsSignals: false,
    hasWidget: true,
  },
  pocket: {
    id: "pocket",
    name: "Pocket",
    description: "Show your saved articles and reading list",
    icon: "BookMarked",
    color: "#EF4056",
    authMethod: "api_key",
    connectionFields: [
      {
        key: "consumer_key",
        label: "Consumer Key",
        type: "password",
        placeholder: "Your Pocket consumer key",
        required: true,
      },
    ],
    capabilities: ["content_feed", "profile_widget"],
    feedsSignals: true,
    hasWidget: true,
  },
  readwise: {
    id: "readwise",
    name: "Readwise",
    description: "Show your highlights and reading activity",
    icon: "Highlighter",
    color: "#F5C518",
    authMethod: "api_key",
    connectionFields: [
      {
        key: "token",
        label: "Access Token",
        type: "password",
        placeholder: "Your Readwise access token",
        required: true,
      },
    ],
    capabilities: ["content_feed", "profile_widget"],
    feedsSignals: true,
    hasWidget: true,
  },
  discord: {
    id: "discord",
    name: "Discord",
    description: "Show your Discord servers and activity",
    icon: "MessageCircle",
    color: "#5865F2",
    authMethod: "oauth2",
    connectionFields: [],
    capabilities: ["profile_widget", "social_graph"],
    feedsSignals: false,
    hasWidget: true,
  },
};

// ─── Registry API ──────────────────────────────────────────

export function getProvider(id: IntegrationProviderId): IntegrationProvider | undefined {
  return PROVIDERS[id];
}

export function getAllProviders(): IntegrationProvider[] {
  return Object.values(PROVIDERS);
}

export function getAvailableProviders(): IntegrationProvider[] {
  // Return providers that are currently implementable (have auth methods we support)
  return Object.values(PROVIDERS).filter(
    p => p.authMethod === "none" || p.authMethod === "username" || p.authMethod === "api_key"
  );
}

export function getProvidersByCapability(cap: string): IntegrationProvider[] {
  return Object.values(PROVIDERS).filter(p =>
    p.capabilities.includes(cap as never)
  );
}
