"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentHumanPair } from "@/types/agent-pair";

export function usePair() {
  const [pair, setPair] = useState<AgentHumanPair | null>(null);
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pair?active=true");
      const data = await res.json();
      if (data.success && data.pair) {
        setPair(data.pair);
        setActivePairId(data.activePairId ?? data.pair?.id ?? null);
      } else {
        setPair(null);
        setActivePairId(null);
      }
    } catch {
      setPair(null);
      setActivePairId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pair, activePairId, loading, refetch };
}
