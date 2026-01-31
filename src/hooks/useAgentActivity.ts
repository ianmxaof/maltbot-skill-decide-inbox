"use client";

import { useState, useEffect, useCallback } from "react";

export type MoltbookActivityPost = {
  id: string;
  title: string;
  content: string;
  submolt: string;
  author: string;
  authorKarma: number;
  upvotes: number;
  comments: number;
  createdAt: string;
  source: "moltbook";
  agentName?: string;
};

export function useAgentActivity() {
  const [posts, setPosts] = useState<MoltbookActivityPost[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/moltbook/activity?limit=25");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setRosterCount(data.rosterCount ?? 0);
    } catch {
      setPosts([]);
      setRosterCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 60_000);
    return () => clearInterval(t);
  }, [refetch]);

  return { posts, rosterCount, loading, refetch };
}
