"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  isOwnAgent?: boolean; // true if author is one of your roster agents
};

export function useAgentActivity() {
  const [posts, setPosts] = useState<MoltbookActivityPost[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moltbook/activity?limit=25");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setRosterCount(data.rosterCount ?? 0);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      setPosts([]);
      setRosterCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Set up 30-second refresh
    intervalRef.current = setInterval(refetch, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

  return { posts, rosterCount, loading, lastRefresh, refetch };
}
