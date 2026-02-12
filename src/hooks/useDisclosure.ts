"use client";

import { useState, useEffect, useCallback } from "react";
import type { DisclosureState } from "@/types/disclosure";

export function useDisclosure(pairId: string | null) {
  const [state, setState] = useState<DisclosureState | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!pairId) {
      setState(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/disclosure?pairId=${encodeURIComponent(pairId)}`);
      const data = await res.json();
      if (data.success && data.state) {
        setState(data.state);
      }
    } catch (e) {
      console.error("[useDisclosure] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const dismissCooldown = useCallback(async () => {
    if (!pairId) return;
    await fetch("/api/disclosure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId, action: "dismissCooldown" }),
    }).catch((e) => console.error("[useDisclosure] dismissCooldown failed:", e));
    await refetch();
  }, [pairId, refetch]);

  const clearCelebration = useCallback(async () => {
    if (!pairId) return;
    await fetch("/api/disclosure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId, action: "clearCelebration" }),
    }).catch((e) => console.error("[useDisclosure] clearCelebration failed:", e));
    await refetch();
  }, [pairId, refetch]);

  const markVisited = useCallback(async (feature: string) => {
    if (!pairId) return;
    await fetch("/api/disclosure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId, action: "markVisited", feature }),
    }).catch((e) => console.error("[useDisclosure] markVisited failed:", e));
    await refetch();
  }, [pairId, refetch]);

  return { state, loading, refetch, dismissCooldown, clearCelebration, markVisited };
}
