"use client";

import type { MoltbookPost } from "@/types/dashboard";

export function SignalCard({
  signal,
  compact = false,
  showActions = false,
}: {
  signal: MoltbookPost;
  compact?: boolean;
  showActions?: boolean;
}) {
  const score = signal.relevanceScore ?? 0;
  const isHighRelevance = score > 0.9;

  if (compact) {
    return (
      <div className="p-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium leading-tight">{signal.title}</h4>
          <span
            className={`px-1.5 py-0.5 text-xs rounded ${
              isHighRelevance ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"
            }`}
          >
            {Math.round(score * 100)}%
          </span>
        </div>
        <p className="text-xs text-zinc-500 mb-2">
          m/{signal.submolt} • @{signal.author} ({signal.authorKarma} karma)
        </p>
        {signal.relevanceReason && (
          <p className="text-xs text-amber-400/80 italic">→ {signal.relevanceReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs bg-zinc-800 rounded">m/{signal.submolt}</span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-500">@{signal.author}</span>
            <span className="text-xs text-zinc-600">({signal.authorKarma} karma)</span>
          </div>
          <h3 className="text-lg font-medium mb-2">{signal.title}</h3>
          <p className="text-sm text-zinc-400 mb-3">{signal.content}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>↑ {signal.upvotes}</span>
            <span>💬 {signal.comments}</span>
            <span>{signal.createdAt}</span>
          </div>
        </div>
        <div className="text-right space-y-2">
          <div
            className={`px-3 py-1.5 rounded-lg ${
              isHighRelevance ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <span className="text-lg font-bold">{Math.round(score * 100)}%</span>
            <span className="text-xs ml-1">match</span>
          </div>
          {signal.relevanceReason && (
            <p className="text-xs text-amber-400/80 max-w-[200px]">{signal.relevanceReason}</p>
          )}
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
          <button
            type="button"
            className="px-4 py-2 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
          >
            Import to Context Hub
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Ask Agent to Verify
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            View on Moltbook
          </button>
        </div>
      )}
    </div>
  );
}
