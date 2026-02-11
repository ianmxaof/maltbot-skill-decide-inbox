"use client";

import { useState, useEffect, useCallback } from "react";

export interface ActivityFeedItem {
  id: string;
  pairId: string;
  timestamp: string;
  action: string;
  reasoning: string;
  outcome?: "kept" | "reverted" | "modified";
  tags: string[];
}

export function useActivityFeed(opts?: { pairId?: string; limit?: number }) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts?.pairId) params.set("pairId", opts.pairId);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [opts?.pairId, opts?.limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}
