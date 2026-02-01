"use client";

import { useState, useEffect, useCallback } from "react";
import type { DecideInboxItem } from "@/types/dashboard";

/** Real pending items from /api/moltbook/pending (agent-proposed Moltbook actions). */
export function useDecideInboxData() {
  const [items, setItems] = useState<DecideInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moltbook/pending");
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
    const t = setInterval(refetch, 30_000); // refresh every 30s
    return () => clearInterval(t);
  }, [refetch]);

  return { pendingCount: items.length, items, loading, refetch };
}
