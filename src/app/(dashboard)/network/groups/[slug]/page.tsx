"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePair } from "@/hooks/usePair";
import type { EmergentGroup, DecisionPool } from "@/types/network";

export default function GroupDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { pair } = usePair();
  const [group, setGroup] = useState<EmergentGroup | null>(null);
  const [pools, setPools] = useState<DecisionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimName, setClaimName] = useState("");
  const [claimDesc, setClaimDesc] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch("/api/network/groups")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const found = (data.groups as EmergentGroup[]).find((g) => g.slug === slug);
          if (found) {
            setGroup(found);
            // Fetch pools for this group
            fetch(`/api/network/pools?groupId=${encodeURIComponent(found.id)}`)
              .then((r) => r.json())
              .then((pData) => {
                if (pData.success) setPools(pData.pools ?? []);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleClaim = useCallback(async () => {
    if (!group || !pair?.id) return;
    try {
      const res = await fetch("/api/network/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          claimerPairId: pair.id,
          name: claimName || undefined,
          description: claimDesc || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) setGroup(data.group);
    } catch {
      // silent
    }
  }, [group, pair?.id, claimName, claimDesc]);

  const handleVote = useCallback(async (poolId: string, choiceIndex: number) => {
    if (!pair?.id) return;
    try {
      const res = await fetch("/api/network/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", poolId, pairId: pair.id, choiceIndex }),
      });
      const data = await res.json();
      if (data.success) {
        setPools((prev) => prev.map((p) => (p.id === poolId ? data.pool : p)));
      }
    } catch {
      // silent
    }
  }, [pair?.id]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-6 py-8"><div className="text-sm text-zinc-500">Loading group...</div></main>;
  }

  if (!group) {
    return <main className="mx-auto max-w-4xl px-6 py-8"><div className="text-sm text-zinc-400">Group not found.</div></main>;
  }

  const isMember = pair?.id ? group.memberPairIds.includes(pair.id) : false;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-white">{group.name}</h2>
          {group.isClaimed && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              claimed
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400">{group.description}</p>
        <div className="text-xs text-zinc-500 mt-2">
          {group.memberCount} members &middot; {group.activityCount} activities
          {group.lastActivityAt && ` \u00B7 Last active ${new Date(group.lastActivityAt).toLocaleDateString()}`}
        </div>
      </div>

      {/* Collective Fingerprint */}
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5 mb-6">
        <div className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-2">Collective Governance</div>
        <div className="text-sm text-zinc-200">{group.collectiveFingerprint.summary}</div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
          <div>
            <span className="text-zinc-500">Approval rate</span>
            <div className="text-white font-medium mt-0.5">{Math.round(group.collectiveFingerprint.avgApprovalRate * 100)}%</div>
          </div>
          <div>
            <span className="text-zinc-500">Velocity</span>
            <div className="text-white font-medium mt-0.5 capitalize">{group.collectiveFingerprint.dominantVelocity}</div>
          </div>
          <div>
            <span className="text-zinc-500">Risk stance</span>
            <div className="text-white font-medium mt-0.5 capitalize">{group.collectiveFingerprint.dominantRisk}</div>
          </div>
        </div>
      </div>

      {/* Shared Domains */}
      {group.sharedDomains.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Shared Domains</h3>
          <div className="flex flex-wrap gap-2">
            {group.sharedDomains.map((d) => (
              <span key={d} className="text-xs px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Shared Sources */}
      {group.sharedSources.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Shared Sources</h3>
          <div className="space-y-1.5">
            {group.sharedSources.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.trackedByPercent}% of members</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim Panel */}
      {isMember && !group.isClaimed && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
          <div className="text-sm font-semibold text-amber-300 mb-2">Claim this group</div>
          <p className="text-xs text-zinc-400 mb-3">
            This group was auto-detected. As a member, you can claim it, give it a name, and add a description.
          </p>
          <input
            type="text"
            placeholder="Group name (optional)"
            value={claimName}
            onChange={(e) => setClaimName(e.target.value)}
            className="w-full mb-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={claimDesc}
            onChange={(e) => setClaimDesc(e.target.value)}
            className="w-full mb-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleClaim}
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition"
          >
            Claim Group
          </button>
        </div>
      )}

      {/* Decision Pools */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Decision Pools</h3>
        {pools.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
            No decision pools yet.
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => {
              const hasVoted = pair?.id ? pool.votes.some((v) => v.pairId === pair.id) : false;
              return (
                <div key={pool.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">{pool.title}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      pool.status === "open" ? "text-emerald-400 bg-emerald-500/10" :
                      pool.status === "resolved" ? "text-violet-400 bg-violet-500/10" :
                      "text-zinc-400 bg-zinc-700/30"
                    }`}>
                      {pool.status}
                    </span>
                  </div>
                  {pool.description && <p className="text-xs text-zinc-400 mb-3">{pool.description}</p>}

                  <div className="space-y-2">
                    {pool.item.options.map((opt, idx) => {
                      const voteCount = pool.votes.filter((v) => v.choiceIndex === idx).length;
                      const pct = pool.votes.length > 0 ? Math.round((voteCount / pool.votes.length) * 100) : 0;
                      const isWinner = pool.outcome?.winningChoiceIndex === idx;

                      return (
                        <button
                          key={idx}
                          disabled={pool.status !== "open" || !isMember || hasVoted}
                          onClick={() => handleVote(pool.id, idx)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg border transition text-sm ${
                            isWinner
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
                          } ${pool.status !== "open" || !isMember || hasVoted ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{opt}</span>
                            {pool.votes.length > 0 && (
                              <span className="text-xs text-zinc-500">{voteCount} votes ({pct}%)</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs text-zinc-500 mt-3">
                    {pool.votes.length}/{pool.quorum} quorum &middot; {Math.round(pool.consensusThreshold * 100)}% consensus needed
                    {pool.outcome && ` \u00B7 Resolved: ${pool.outcome.winningChoice}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
