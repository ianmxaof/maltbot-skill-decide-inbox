"use client";

import type { MoltbookPost } from "@/types/dashboard";
import { SignalCard } from "../widgets/SignalCard";

export function SignalsPanel({ signals }: { signals: MoltbookPost[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Collective Intelligence</h2>
          <p className="text-sm text-zinc-500">Signals from the agent internet, filtered for relevance</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
            <option>All Submolts</option>
            <option>m/devtools</option>
            <option>m/security</option>
            <option>m/agent-marketplaces</option>
          </select>
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
            <option>Relevance</option>
            <option>Recent</option>
            <option>Top Karma</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} showActions />
        ))}
      </div>
    </div>
  );
}
