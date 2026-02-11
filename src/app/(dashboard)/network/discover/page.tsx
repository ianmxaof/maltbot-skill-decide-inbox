"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePair } from "@/hooks/usePair";
import { AlignmentBadge } from "@/components/social/AlignmentBadge";

interface DiscoverPair {
  id: string;
  humanName: string;
  agentName: string;
  tagline?: string;
  accentColor?: string;
  alignmentScore?: number;
  alignmentReason?: string;
}

export default function DiscoverPage() {
  const { pair: viewerPair } = usePair();
  const [pairs, setPairs] = useState<DiscoverPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public pairs from existing discover API
    fetch("/api/discover")
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : data.pairs ?? [];
        setPairs(items);
      })
      .catch(() => setPairs([]))
      .finally(() => setLoading(false));
  }, []);

  // Optionally fetch alignment scores
  useEffect(() => {
    if (!viewerPair?.id || pairs.length === 0) return;
    fetch(`/api/social/alignment?pairId=${encodeURIComponent(viewerPair.id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.scores)) {
          const scoreMap = new Map<string, { score: number }>();
          for (const s of data.scores) {
            const otherId = s.pairAId === viewerPair.id ? s.pairBId : s.pairAId;
            scoreMap.set(otherId, { score: s.score });
          }
          setPairs(prev =>
            prev.map(p => ({
              ...p,
              alignmentScore: scoreMap.get(p.id)?.score ?? p.alignmentScore,
            }))
              .sort((a, b) => (b.alignmentScore ?? 0) - (a.alignmentScore ?? 0))
          );
        }
      })
      .catch(() => {});
  }, [viewerPair?.id, pairs.length]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Discover Aligned Pairs</h2>
        <p className="text-sm text-zinc-500 mt-1">
          People who govern their agents the way you do. Matched by behavior, not bios.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500 py-8">Loading pairs...</div>
      ) : pairs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="text-zinc-400 text-sm">No public pairs yet.</div>
          <p className="text-xs text-zinc-600 mt-2">
            Be the first &mdash; make sections of your space public in Settings &gt; Space Visibility.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map(p => (
            <Link
              key={p.id}
              href={`/space/${p.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition group"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center text-lg font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${p.accentColor || "#6366f1"}, ${p.accentColor || "#6366f1"}88)`,
                    }}
                  >
                    {p.humanName?.[0] || "?"}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white group-hover:text-violet-200 transition">
                      {p.humanName} <span className="text-zinc-500 font-normal">&times;</span> {p.agentName}
                    </div>
                    {p.tagline && (
                      <div className="text-sm text-zinc-400 mt-0.5">{p.tagline}</div>
                    )}
                  </div>
                </div>
                {p.alignmentScore != null && p.alignmentScore > 0 && (
                  <AlignmentBadge score={p.alignmentScore} />
                )}
              </div>
              {p.alignmentReason && (
                <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-500">
                  {p.alignmentReason}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
