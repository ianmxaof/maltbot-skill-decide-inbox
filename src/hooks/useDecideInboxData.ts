"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRefreshIntervalMs, REFRESH_INTERVAL_CHANGED } from "@/lib/refresh-interval";
import type { DecideInboxItem } from "@/types/dashboard";

/** Real pending items from /api/decide/pending (social + dev actions). */
export function useDecideInboxData(options?: { pausePolling?: boolean }) {
  const pausePolling = options?.pausePolling ?? false;
  const [items, setItems] = useState<DecideInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [intervalMs, setIntervalMs] = useState(getRefreshIntervalMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = () => setIntervalMs(getRefreshIntervalMs());
    window.addEventListener(REFRESH_INTERVAL_CHANGED, handler);
    return () => window.removeEventListener(REFRESH_INTERVAL_CHANGED, handler);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/decide/pending");
      const data = await res.json();
      const raw = Array.isArray(data.items) ? data.items : [];
      setItems(raw as DecideInboxItem[]);
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

  return { pendingCount: items.length, items, loading, refetch };
}
