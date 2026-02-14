"use client";

import { useState } from "react";
import { GitFork, Check, Loader2, ChevronDown, X } from "lucide-react";

interface Props {
  sourcePairId: string;
  sourcePairName: string;
  viewerPairId: string;
  accentColor?: string;
}

export function ForkConfigButton({ sourcePairId, sourcePairName, viewerPairId, accentColor }: Props) {
  const [showOptions, setShowOptions] = useState(false);
  const [forking, setForking] = useState(false);
  const [forked, setForked] = useState(false);
  const [result, setResult] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Options
  const [forkSources, setForkSources] = useState(true);
  const [forkTiers, setForkTiers] = useState(true);
  const [forkPhilosophy, setForkPhilosophy] = useState(false);

  const handleFork = async () => {
    setForking(true);
    setError("");
    try {
      const res = await fetch("/api/social/fork-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePairId,
          targetPairId: viewerPairId,
          options: {
            contextSources: forkSources,
            autonomyTiers: forkTiers,
            philosophy: forkPhilosophy,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForked(true);
        setResult(data.forked);
        setShowOptions(false);
      } else {
        setError(data.error ?? "Fork failed");
      }
    } catch {
      setError("Network error");
    }
    setForking(false);
  };

  if (forked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
        <Check className="w-4 h-4 text-emerald-400" />
        <div>
          <div className="text-xs text-emerald-400 font-medium">
            Config forked from {sourcePairName}
          </div>
          <div className="text-[10px] text-emerald-400/60">
            {result.join(" · ")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(s => !s)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition"
      >
        <GitFork className="w-3.5 h-3.5" style={accentColor ? { color: accentColor } : undefined} />
        Fork Config
        <ChevronDown className="w-3 h-3 text-zinc-600" />
      </button>

      {showOptions && (
        <div className="absolute top-full mt-1 right-0 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-zinc-200">Fork Configuration</div>
            <button onClick={() => setShowOptions(false)} className="text-zinc-600 hover:text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 mb-3">
            Copy {sourcePairName}&apos;s setup to your pair. This merges their sources with yours — nothing is removed.
          </p>

          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forkSources}
                onChange={e => setForkSources(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-violet-500"
              />
              <span className="text-xs text-zinc-300">Context Sources</span>
              <span className="text-[10px] text-zinc-600">(repos, feeds, topics)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forkTiers}
                onChange={e => setForkTiers(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-violet-500"
              />
              <span className="text-xs text-zinc-300">Autonomy Tiers</span>
              <span className="text-[10px] text-zinc-600">(agent permissions)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forkPhilosophy}
                onChange={e => setForkPhilosophy(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-violet-500"
              />
              <span className="text-xs text-zinc-300">Operating Philosophy</span>
              <span className="text-[10px] text-zinc-600">(replaces yours)</span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-red-400 mb-2">{error}</div>
          )}

          <button
            onClick={handleFork}
            disabled={forking || (!forkSources && !forkTiers && !forkPhilosophy)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50 transition"
          >
            {forking ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitFork className="w-4 h-4" />}
            {forking ? "Forking..." : "Fork to My Pair"}
          </button>
        </div>
      )}
    </div>
  );
}
