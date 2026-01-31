"use client";

import { AlertTriangle, Check, Lock, Shield } from "lucide-react";
import type { SocialExposure, BehaviorAnomaly } from "@/types/dashboard";

export function SecurityPanel({ exposure, anomalies }: { exposure: SocialExposure; anomalies: BehaviorAnomaly[] }) {
  const riskColors = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-rose-500/20 text-rose-400",
  };

  const anomalyColors = {
    info: "bg-blue-500/10 border-blue-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    critical: "bg-rose-500/10 border-rose-500/30",
  };

  const anomalyIconColors = {
    info: "text-blue-400",
    warning: "text-amber-400",
    critical: "text-rose-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Social Security Posture</h2>
        <p className="text-sm text-zinc-500">What your agent reveals on Moltbook</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Exposure Analysis */}
        <div className="p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Exposure Analysis</h3>
            <span className={`px-3 py-1 rounded-lg text-sm ${riskColors[exposure.riskScore]}`}>
              {exposure.riskScore.toUpperCase()} RISK
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Projects Mentioned</span>
                <span className="text-sm font-medium">{exposure.projectsMentioned.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exposure.projectsMentioned.map((p) => (
                  <span key={p} className="px-2 py-1 text-xs bg-zinc-800 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">API Endpoints</span>
                <span className="text-sm font-medium">{exposure.apiEndpoints.length}</span>
              </div>
              <div className="space-y-1">
                {exposure.apiEndpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {ep.flagged ? (
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-400" />
                    )}
                    <code className={ep.flagged ? "text-rose-400" : "text-zinc-400"}>{ep.path}</code>
                    {ep.flagged && <span className="text-rose-400">(FLAGGED)</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Human Info Leaked</span>
                <span
                  className={`text-sm font-medium ${
                    exposure.humanInfoLeaked ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {exposure.humanInfoLeaked ? "YES" : "NONE"} ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Behavioral Monitoring */}
        <div className="p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="font-semibold mb-6">Behavioral Monitoring</h3>

          {anomalies.length > 0 ? (
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 rounded-lg border ${anomalyColors[anomaly.severity]}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${anomalyIconColors[anomaly.severity]}`} />
                    <span className="text-sm font-medium">{anomaly.pattern.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{anomaly.description}</p>
                  <p className="text-xs text-zinc-500">
                    {anomaly.participatingAgents} agents • {anomaly.detectedAt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No anomalies detected</p>
              <p className="text-xs">Your agent&apos;s behavior appears normal</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Queue */}
      <div className="p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Pending Posts (Pre-Flight Check)</h3>
          <span className="text-xs text-zinc-500">2 posts queued</span>
        </div>
        <p className="text-sm text-zinc-400">
          Enable pre-flight security scanning to review posts before they go live.
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Enable Pre-Flight Checks
        </button>
      </div>
    </div>
  );
}
