"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EmergentGroup } from "@/types/network";

export default function NetworkGroupsPage() {
  const [groups, setGroups] = useState<EmergentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/network/groups")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setGroups(data.groups ?? []);
      })
      .catch((e) => console.error("[network/groups] fetch failed:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Emergent Groups</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Clusters of pairs with aligned governance patterns &mdash; detected automatically.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500 py-8">Detecting groups...</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="text-zinc-400 text-sm">No groups detected yet.</div>
          <p className="text-xs text-zinc-600 mt-2">
            Groups emerge when 3+ pairs share aligned governance fingerprints. Make your fingerprint public in Settings to participate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/network/groups/${g.slug}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{g.name}</h3>
                    {g.trending && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        trending
                      </span>
                    )}
                    {g.isClaimed && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        claimed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{g.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-lg font-bold text-white">{g.memberCount}</div>
                  <div className="text-xs text-zinc-500">members</div>
                </div>
              </div>

              {/* Shared domains */}
              {g.sharedDomains.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {g.sharedDomains.map((d) => (
                    <span key={d} className="text-xs px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {/* Collective fingerprint summary */}
              <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800/50">
                {g.collectiveFingerprint.summary}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
