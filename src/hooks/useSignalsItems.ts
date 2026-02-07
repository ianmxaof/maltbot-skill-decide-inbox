"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRefreshIntervalMs, REFRESH_INTERVAL_CHANGED } from "@/lib/refresh-interval";
import type { FeedItem } from "@/types/signals";

export function useSignalsItems(options?: { pausePolling?: boolean }) {
  const pausePolling = options?.pausePolling ?? false;
  const [items, setItems] = useState<FeedItem[]>([]);
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
      const res = await fetch("/api/signals/items");
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (typeof data.rosterCount === "number") setRosterCount(data.rosterCount);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      setItems([]);
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

  return { items, rosterCount, loading, lastRefresh, refetch };
}
