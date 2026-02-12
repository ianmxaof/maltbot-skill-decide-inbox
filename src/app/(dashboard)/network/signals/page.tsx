"use client";

import { useEffect, useState } from "react";
import { usePair } from "@/hooks/usePair";
import { ConvergenceBadge } from "@/components/network/ConvergenceBadge";
import type { SignalConvergence } from "@/types/network";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  escalation_cluster: { label: "Escalation Cluster", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  tracking_wave: { label: "Tracking Wave", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  decision_alignment: { label: "Decision Alignment", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  anomaly_consensus: { label: "Anomaly Consensus", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  context_convergence: { label: "Context Convergence", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
};

export default function NetworkSignalsPage() {
  const { pair } = usePair();
  const [convergences, setConvergences] = useState<SignalConvergence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const viewerParam = pair?.id ? `viewerPairId=${encodeURIComponent(pair.id)}&` : "";
    fetch(`/api/network/signals?${viewerParam}limit=30`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConvergences(data.convergences ?? []);
      })
      .catch((e) => console.error("[network/signals] fetch failed:", e))
      .finally(() => setLoading(false));
  }, [pair?.id]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Signal Convergences</h2>
        <p className="text-sm text-zinc-500 mt-1">
          When multiple pairs react to the same signal, the platform surfaces it.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500 py-8">Scanning for convergences...</div>
      ) : convergences.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="text-zinc-400 text-sm">No convergences detected yet.</div>
          <p className="text-xs text-zinc-600 mt-2">
            Convergences emerge when multiple pairs act on the same signal within a time window.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {convergences.map((c) => {
            const typeInfo = TYPE_LABELS[c.type] ?? { label: c.type, color: "text-zinc-400 bg-zinc-700/30 border-zinc-700" };
            return (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {c.viewerHasActed && (
                        <span className="text-[10px] text-emerald-400 font-semibold">You participated</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-white">{c.signalLabel}</h3>
                    <div className="text-xs text-zinc-500 mt-0.5">{c.signalCategory}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-bold text-white">{c.totalPairs}</div>
                    <div className="text-xs text-zinc-500">pairs</div>
                  </div>
                </div>

                {/* Actions breakdown */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {c.actions.map((a) => (
                    <span key={a.action} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300">
                      {a.count} {a.action} ({Math.round(a.percentage * 100)}%)
                    </span>
                  ))}
                </div>

                {/* Velocity & timing */}
                <div className="text-xs text-zinc-500 flex items-center gap-4">
                  <span>Velocity: {c.velocityPerHour.toFixed(1)} pairs/hr</span>
                  <span>Strength: {Math.round(c.strength * 100)}%</span>
                  <span>Window: {c.window}</span>
                </div>

                {/* Converging pairs */}
                {c.convergingPairs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50">
                    <ConvergenceBadge
                      count={c.totalPairs - (c.viewerHasActed ? 1 : 0)}
                      pairNames={c.convergingPairs.map((p) => p.pairName).slice(0, 5)}
                      action={c.convergingPairs[0]?.action ?? "acted on this"}
                      convergenceId={c.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
