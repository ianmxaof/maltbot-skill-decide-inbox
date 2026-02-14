"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import type { VibeCheckSummary, VibeReaction } from "@/types/social";

const REACTIONS: {
  value: VibeReaction;
  emoji: string;
  label: string;
}[] = [
  { value: "aligned", emoji: "🤝", label: "Aligned" },
  { value: "interesting", emoji: "🔍", label: "Interesting" },
  { value: "inspiring", emoji: "✨", label: "Inspiring" },
  { value: "based", emoji: "💯", label: "Based" },
  { value: "galaxy-brain", emoji: "🧠", label: "Galaxy Brain" },
  { value: "chaotic", emoji: "🌀", label: "Chaotic Energy" },
];

interface VibeCheckProps {
  targetPairId: string;
  viewerPairId?: string;
  initialData?: VibeCheckSummary;
  accentColor: string;
}

export function VibeCheck({ targetPairId, viewerPairId, initialData, accentColor }: VibeCheckProps) {
  const [summary, setSummary] = useState<VibeCheckSummary | undefined>(initialData);
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const sendVibe = useCallback(async (reaction: VibeReaction) => {
    if (!viewerPairId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/social/vibe-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPairId, reactorPairId: viewerPairId, reaction }),
      });
      if (res.ok) {
        // Refresh summary
        const r2 = await fetch(
          `/api/social/vibe-check?targetPairId=${encodeURIComponent(targetPairId)}&viewerPairId=${encodeURIComponent(viewerPairId)}`
        );
        const data = await r2.json();
        if (data.success) setSummary(data.summary);
      }
    } catch {
      // silent
    } finally {
      setSending(false);
      setShowPicker(false);
    }
  }, [targetPairId, viewerPairId, sending]);

  // Reactions with counts > 0, sorted by count
  const activeReactions = REACTIONS
    .filter(r => (summary?.counts[r.value] ?? 0) > 0)
    .sort((a, b) => (summary?.counts[b.value] ?? 0) - (summary?.counts[a.value] ?? 0));

  return (
    <div className="space-y-2">
      {/* Aggregated reaction display */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeReactions.map(r => {
            const count = summary?.counts[r.value] ?? 0;
            const isViewerReaction = summary?.viewerReaction === r.value;

            return (
              <div
                key={r.value}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                  isViewerReaction
                    ? "bg-violet-500/15 border border-violet-500/30"
                    : "bg-zinc-800/50 border border-zinc-800"
                }`}
                title={`${count} ${r.label}`}
              >
                <span>{r.emoji}</span>
                <span className={`font-medium ${isViewerReaction ? "text-violet-300" : "text-zinc-400"}`}>
                  {count}
                </span>
              </div>
            );
          })}

          {summary && summary.total > 0 && (
            <span className="text-[10px] text-zinc-600 ml-1">
              {summary.total} vibe{summary.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Vibe check button / picker */}
      {viewerPairId && viewerPairId !== targetPairId && (
        <>
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {summary?.viewerReaction ? "Change Vibe" : "Vibe Check"}
            </button>
          ) : (
            <div className="flex items-center gap-1 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-700">
              {REACTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => sendVibe(r.value)}
                  disabled={sending}
                  className={`group relative px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/5 ${
                    sending ? "opacity-50" : ""
                  } ${summary?.viewerReaction === r.value ? "bg-violet-500/10 ring-1 ring-violet-500/30" : ""}`}
                  title={r.label}
                >
                  <span className="text-base group-hover:scale-125 inline-block transition-transform">
                    {r.emoji}
                  </span>
                  {/* Tooltip */}
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                    {r.label}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setShowPicker(false)}
                className="px-2 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
