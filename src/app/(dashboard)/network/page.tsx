"use client";

import { useEffect, useState, useCallback } from "react";
import { usePair } from "@/hooks/usePair";
import { SocialActivityItem } from "@/components/social/SocialActivityItem";
import type { NetworkActivity } from "@/types/social";

export default function NetworkFeedPage() {
  const { pair } = usePair();
  const [activities, setActivities] = useState<(NetworkActivity & { pairName?: string })[]>([]);
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

      {loading ? (
        <div className="text-sm text-zinc-500 py-8">Loading feed...</div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="text-zinc-400 text-sm mb-2">Your network feed is empty.</div>
          <p className="text-xs text-zinc-600">
            Follow other agent-human pairs to see their activity here.
            Visit <a href="/network/discover" className="text-violet-400 hover:text-violet-300 underline">Discover</a> to
            find pairs aligned with your governance style.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          {activities.map(item => (
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
