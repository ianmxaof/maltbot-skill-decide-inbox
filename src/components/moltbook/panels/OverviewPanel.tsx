"use client";

import Link from "next/link";
import { Eye, MessageSquare, Brain, ExternalLink, ChevronRight, AlertTriangle } from "lucide-react";
import type { MoltbookAgent, MoltbookPost, BehaviorAnomaly } from "@/types/dashboard";
import { AgentStatusBar } from "../widgets/AgentStatusBar";
import { SignalCard } from "../widgets/SignalCard";
import { MoltbookRegisterWidget } from "../MoltbookRegisterWidget";

type RosterAgent = { id: string; name: string; keyHint?: string; addedAt: string };

export function OverviewPanel({
  agent,
  signals,
  anomalies,
  socialPendingCount,
  isConfigured,
  roster = [],
}: {
  agent: MoltbookAgent;
  signals: MoltbookPost[];
  anomalies: BehaviorAnomaly[];
  socialPendingCount: number;
  isConfigured?: boolean;
  roster?: RosterAgent[];
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Connect to Moltbook (when not configured) */}
      {!isConfigured && (
        <div className="col-span-3 mb-4">
          <MoltbookRegisterWidget />
        </div>
      )}

      {/* Left Column - Stats & Status */}
      <div className="space-y-6">
        {/* Agent Card */}
        <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
              🦞
            </div>
            <div>
              <h3 className="font-bold text-lg">@{agent.name}</h3>
              <p className="text-xs text-zinc-500">Active {agent.lastActive}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{agent.karma}</div>
              <div className="text-xs text-zinc-500">Karma</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-300">{agent.followers}</div>
              <div className="text-xs text-zinc-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-300">{agent.following}</div>
              <div className="text-xs text-zinc-500">Following</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3">QUICK ACTIONS</h3>
          <div className="space-y-2">
            <a
              href={`https://www.moltbook.com/u/${encodeURIComponent(agent.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
            >
              <Eye className="w-4 h-4 text-zinc-400" />
              <span className="text-sm">View Moltbook Profile</span>
              <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto" />
            </a>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
            >
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="text-sm">Browse Feed</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
            >
              <Brain className="w-4 h-4 text-zinc-400" />
              <span className="text-sm">Heartbeat Settings</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Column - Pending Link & Anomalies */}
      <div className="space-y-6">
        {/* Pending Actions - Link to Decide Inbox */}
        {socialPendingCount > 0 && (
          <Link
            href="/decide?filter=social"
            className="block p-5 bg-amber-500/5 rounded-lg border border-amber-500/20 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400">PENDING APPROVAL</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              {socialPendingCount} social action{socialPendingCount !== 1 ? "s" : ""} awaiting your
              decision
            </p>
            <span className="text-sm font-medium text-amber-400">Review in Decide Inbox →</span>
          </Link>
        )}

        {/* Behavior Anomalies */}
        {anomalies.length > 0 && (
          <div className="p-5 bg-amber-500/5 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400">BEHAVIORAL ANOMALY</h3>
            </div>
            {anomalies.map((anomaly) => (
              <div key={anomaly.id} className="text-sm">
                <p className="text-zinc-300 mb-2">{anomaly.description}</p>
                <p className="text-xs text-zinc-500">
                  {anomaly.participatingAgents} agents involved • Detected {anomaly.detectedAt}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Allow Participation
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                  >
                    Exit & Monitor
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column - Top Signals */}
      <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-400">TOP SIGNALS</h3>
          <span className="text-xs text-zinc-600">Relevance-sorted</span>
        </div>
        <div className="space-y-3">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
