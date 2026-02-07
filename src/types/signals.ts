/**
 * Types for Signals panel: normalized feed items and source config.
 */

export type FeedItemSource = "moltbook" | "rss" | "github";

export type FeedItem = {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  source: FeedItemSource;
  sourceId?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type FeedSourceType = "moltbook" | "rss" | "github";

export type FeedSource = {
  id: string;
  type: FeedSourceType;
  label: string;
  enabled: boolean;
  /** For type "rss", the feed URL */
  url?: string;
};
