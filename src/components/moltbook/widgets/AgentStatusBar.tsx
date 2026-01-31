"use client";

import { RefreshCw } from "lucide-react";
import type { MoltbookAgent } from "@/types/dashboard";

export function AgentStatusBar({
  agent,
  isRefreshing,
  onRefresh,
}: {
  agent: MoltbookAgent;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-sm text-zinc-400">@{agent.name}</span>
      <div className="h-4 w-px bg-zinc-700" />
      <span className="text-sm font-medium text-amber-400">{agent.karma} karma</span>
      <div className="h-4 w-px bg-zinc-700" />
      <span className="text-xs text-zinc-500">{agent.followers} followers</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className={`ml-auto p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors ${
            isRefreshing ? "animate-spin" : ""
          }`}
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      )}
    </div>
  );
}
