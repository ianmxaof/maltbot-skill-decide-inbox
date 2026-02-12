"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { usePair } from "@/hooks/usePair";
import { useDisclosure } from "@/hooks/useDisclosure";
import { SocialActivityItem } from "@/components/social/SocialActivityItem";
import type { NetworkActivity } from "@/types/social";

const SUB_TABS = [
  { label: "Feed", href: "/network", feature: "network_feed" },
  { label: "Discover", href: "/network/discover", feature: "network_discover" },
  { label: "Pulse", href: "/network/pulse", feature: "network_pulse" },
  { label: "Groups", href: "/network/groups", feature: "network_groups" },
  { label: "Signals", href: "/network/signals", feature: "network_signals" },
] as const;

function NetworkSubNav() {
  const pathname = usePathname();
  const { activePairId } = usePair();
  const { state: disclosure } = useDisclosure(activePairId);

  const visibleTabs = SUB_TABS.filter((tab) => {
    if (tab.feature === "network_feed") return true; // always show Feed if Network is visible
    if (!disclosure) return true; // fallback: show all
    return disclosure.features[tab.feature as keyof typeof disclosure.features];
  });

  return (
    <div className="flex items-center gap-1 mb-6">
      {visibleTabs.map((tab) => {
        const isActive =
          tab.href === "/network"
            ? pathname === "/network"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-sm rounded-full transition ${
              isActive
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function NetworkFeedPage() {
  const { pair } = usePair();
  const [activities, setActivities] = useState<
    (NetworkActivity & { pairName?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    if (!pair?.id) return;
    try {
      const res = await fetch(
        `/api/social/feed?viewerPairId=${encodeURIComponent(pair.id)}&limit=50`
      );
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [pair?.id]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Your Network</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Activity from pairs you follow &mdash; no algorithm, just signal.
        </p>
      </div>

      <NetworkSubNav />

      {loading ? (
        <div className="text-sm text-zinc-500 py-8">Loading feed...</div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="text-zinc-400 text-sm mb-2">
            Your network feed is empty.
          </div>
          <p className="text-xs text-zinc-600">
            Follow other agent-human pairs to see their activity here. Visit{" "}
            <a
              href="/network/discover"
              className="text-violet-400 hover:text-violet-300 underline"
            >
              Discover
            </a>{" "}
            to find pairs aligned with your governance style.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          {activities.map((item) => (
            <SocialActivityItem
              key={item.id}
              type={item.type}
              summary={item.summary}
              createdAt={item.createdAt}
              pairName={item.pairName}
              showPairName
            />
          ))}
        </div>
      )}
    </main>
  );
}
