"use client";

import { useState, useEffect, useCallback } from "react";
import { mockDecideInbox } from "@/data/mock-dashboard";
import type { DecideInboxItem } from "@/types/dashboard";

export function useDecideInboxData() {
  const [socialItems, setSocialItems] = useState<DecideInboxItem[]>([]);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/moltbook/pending");
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setSocialItems(items);
    } catch {
      setSocialItems([]);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const mockItems = mockDecideInbox.filter((i) => i.status === "pending");
  const projectItems = mockItems.filter((i) => i.category === "project");
  const ciCrItems = mockItems.filter((i) => i.category === "ci_cr");
  const allItems: DecideInboxItem[] = [...projectItems, ...socialItems, ...ciCrItems];
  const pendingCount = allItems.length;

  return { pendingCount, items: allItems, refetch };
}
