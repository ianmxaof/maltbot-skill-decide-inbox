"use client";

import { useEffect, useState } from "react";
import type { NetworkPulse } from "@/types/network";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "accelerating") return <span className="text-emerald-400">&#x25B2;</span>;
  if (trend === "slowing") return <span className="text-red-400">&#x25BC;</span>;
  return <span className="text-zinc-500">&#x25CF;</span>;
}

export default function NetworkPulsePage() {
  const [pulse, setPulse] = useState<NetworkPulse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/network/pulse")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.pulse) setPulse(data.pulse);
      })
      .catch((e) => console.error("[network/pulse] fetch failed:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-sm text-zinc-500">Loading pulse...</div>
      </main>
    );
  }

  if (!pulse) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-2">Network Pulse</h2>
        <p className="text-sm text-zinc-400">
          No pulse data yet. The cron job runs every 15 minutes to compute network activity.
        </p>
      </main>
    );
  }

  const postureColor =
    pulse.networkRiskPosture === "conservative" ? "text-blue-400" :
    pulse.networkRiskPosture === "aggressive" ? "text-red-400" : "text-amber-400";

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Network Pulse</h2>
        <p className="text-sm text-zinc-500 mt-1">
          The collective heartbeat &mdash; last computed {new Date(pulse.computedAt).toLocaleString()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Decisions" value={pulse.totalDecisions} sub={`${pulse.activePairs}/${pulse.totalPairs} pairs active`} />
        <StatCard label="Approvals" value={pulse.totalApprovals} sub={`${Math.round(pulse.avgApprovalRate * 100)}% rate`} />
        <StatCard label="Escalations" value={pulse.totalEscalations} sub={`${Math.round(pulse.avgEscalationRate * 100)}% rate`} />
        <StatCard
          label="Velocity"
          value={`${pulse.decisionsPerHour.toFixed(1)}/hr`}
          sub={`${pulse.velocityTrend} ${pulse.velocityDelta > 0 ? "+" : ""}${Math.round(pulse.velocityDelta)}%`}
        />
      </div>

      {/* Posture & Consensus */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Network Posture</div>
          <div className={`text-lg font-bold capitalize ${postureColor}`}>
            {pulse.networkRiskPosture}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Consensus strength: {Math.round(pulse.consensusStrength * 100)}%
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Velocity Trend</div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={pulse.velocityTrend} />
            <span className="text-lg font-bold text-white capitalize">{pulse.velocityTrend}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {pulse.decisionsPerHour.toFixed(1)} decisions/hour
          </div>
        </div>
      </div>

      {/* Trending Signals */}
      {pulse.trendingSignals.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Trending Signals</h3>
          <div className="space-y-2">
            {pulse.trendingSignals.map((sig) => (
              <div key={sig.key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-white">{sig.label}</span>
                  <span className="text-xs text-zinc-500 ml-2">{sig.category}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-400">{sig.uniquePairs} pairs</span>
                  <span className="text-zinc-500">{sig.mentionCount} mentions</span>
                  <TrendIcon trend={sig.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {pulse.networkAnomalies.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Network Anomalies</h3>
          <div className="space-y-2">
            {pulse.networkAnomalies.map((a) => {
              const sevColor = a.severity === "high" ? "border-red-500/30 bg-red-500/5" : a.severity === "medium" ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-700 bg-zinc-900/30";
              return (
                <div key={a.id} className={`rounded-lg border ${sevColor} px-4 py-3`}>
                  <div className="text-sm text-zinc-200">{a.description}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {a.type.replace(/_/g, " ")} &middot; {a.affectedPairCount} pairs &middot; {new Date(a.detectedAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
