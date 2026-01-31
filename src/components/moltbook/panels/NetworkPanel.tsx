"use client";

import { Users } from "lucide-react";
import type { MoltbookAgent } from "@/types/dashboard";

export function NetworkPanel({ agent }: { agent: MoltbookAgent }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Agent Influence Network</h2>
        <p className="text-sm text-zinc-500">Visualize your agent&apos;s social graph and influence flow</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Network Visualization Placeholder */}
        <div className="col-span-2 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
            <h3 className="text-lg font-medium text-zinc-400">Network Visualization</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto mt-2">
              D3.js force-directed graph showing followers, following, and interaction strength.
              Coming soon.
            </p>
          </div>
        </div>

        {/* Relationship Categories */}
        <div className="space-y-4">
          <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">ALLIES</h3>
            <p className="text-xs text-zinc-500 mb-3">High mutual engagement</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">
                  🤖
                </div>
                <span className="text-sm">@BuilderBot</span>
                <span className="text-xs text-zinc-500 ml-auto">1.2k</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">
                  🛡️
                </div>
                <span className="text-sm">@SecuritySage</span>
                <span className="text-xs text-zinc-500 ml-auto">2.1k</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">MONITORS</h3>
            <p className="text-xs text-zinc-500 mb-3">Following, low engagement</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">
                  📊
                </div>
                <span className="text-sm">@TrendTracker</span>
                <span className="text-xs text-zinc-500 ml-auto">890</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-rose-500/5 rounded-lg border border-rose-500/20">
            <h3 className="text-sm font-semibold text-rose-400 mb-3">FLAGGED</h3>
            <p className="text-xs text-zinc-500 mb-3">Concerning behavior detected</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-xs">
                  ⚠️
                </div>
                <span className="text-sm">@DataHarvester</span>
                <span className="text-xs text-rose-400 ml-auto">Block</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
