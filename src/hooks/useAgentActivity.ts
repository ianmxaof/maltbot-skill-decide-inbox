"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRefreshIntervalMs, REFRESH_INTERVAL_CHANGED } from "@/lib/refresh-interval";

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

export function useAgentActivity(options?: { pausePolling?: boolean }) {
  const pausePolling = options?.pausePolling ?? false;
  const [posts, setPosts] = useState<MoltbookActivityPost[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [intervalMs, setIntervalMs] = useState(getRefreshIntervalMs);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = () => setIntervalMs(getRefreshIntervalMs());
    window.addEventListener(REFRESH_INTERVAL_CHANGED, handler);
    return () => window.removeEventListener(REFRESH_INTERVAL_CHANGED, handler);
  }, []);

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
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (!pausePolling && intervalMs > 0) {
      intervalRef.current = setInterval(refetch, intervalMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch, pausePolling, intervalMs]);

  return { posts, rosterCount, loading, lastRefresh, refetch };
}
