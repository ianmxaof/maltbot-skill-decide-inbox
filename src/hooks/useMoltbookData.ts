"use client";

import { useState, useEffect, useCallback } from "react";
import { mockDecideInbox } from "@/data/mock-dashboard";
import {
  mockMoltbookAgent,
  mockMoltbookSignals,
  mockSocialExposure,
  mockBehaviorAnomalies,
} from "@/data/mock-moltbook";
import type { MoltbookAgent, MoltbookPost } from "@/types/dashboard";

type MoltbookProfileRes = {
  configured: boolean;
  agent?: MoltbookAgent | null;
  recentPosts?: MoltbookPost[];
  error?: string;
  hint?: string;
};

type MoltbookFeedRes = {
  configured: boolean;
  posts?: MoltbookPost[];
  error?: string;
};

type MoltbookPendingRes = {
  items: Array<{ id: string }>;
};

type RosterAgent = { id: string; name: string; keyHint?: string; addedAt: string };

export function useMoltbookData(selectedAgentId?: string | null) {
  const [roster, setRoster] = useState<RosterAgent[]>([]);
  const [profile, setProfile] = useState<MoltbookProfileRes | null>(null);
  const [feed, setFeed] = useState<MoltbookFeedRes | null>(null);
  const [pending, setPending] = useState<MoltbookPendingRes | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const agentId = selectedAgentId ?? null;
      const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
      const [rosterRes, profileRes, feedRes, pendingRes] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()),
        fetch(`/api/moltbook/profile${qs}`).then((r) => r.json()),
        fetch(`/api/moltbook/feed?sort=new&limit=15${agentId ? `&agentId=${encodeURIComponent(agentId)}` : ""}`).then((r) => r.json()),
        fetch("/api/moltbook/pending").then((r) => r.json()),
      ]);
      setRoster(rosterRes.agents ?? []);
      setProfile(profileRes);
      setFeed(feedRes);
      setPending(pendingRes);
    } catch {
      setRoster([]);
      setProfile(null);
      setFeed(null);
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 60_000); // refresh every 60s
    return () => clearInterval(t);
  }, [refetch]);

  const isConfigured = profile?.configured ?? roster.length > 0;
  const mockSocialCount = mockDecideInbox.filter(
    (i) => i.category === "social" && i.status === "pending"
  ).length;
  const apiSocialCount = pending?.items?.length ?? 0;
  const socialPendingCount = isConfigured ? apiSocialCount : mockSocialCount;

  const agent: MoltbookAgent = isConfigured && profile?.agent
    ? profile.agent
    : mockMoltbookAgent;

  const signals: MoltbookPost[] = isConfigured && profile?.recentPosts?.length
    ? profile.recentPosts
    : isConfigured && feed?.posts?.length
      ? feed.posts
      : mockMoltbookSignals;

  return {
    roster,
    agent,
    signals,
    exposure: mockSocialExposure,
    anomalies: mockBehaviorAnomalies,
    socialPendingCount,
    lastSyncedAt: profile ? new Date().toISOString() : null,
    isConfigured,
    error: profile?.error ?? null,
    hint: profile?.hint ?? null,
    loading,
    refetch,
  };
}
