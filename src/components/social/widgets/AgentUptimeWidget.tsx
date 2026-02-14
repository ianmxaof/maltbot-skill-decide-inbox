"use client";

import { useState, useEffect } from "react";
import { Activity, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["agentUptime"];
  accentColor: string;
  /** Pair ID for live polling */
  pairId?: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "unknown";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function uptimeDuration(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `${Math.floor(ms / 60000)}m`;
}

export function AgentUptimeWidget({ data: initialData, accentColor, pairId }: Props) {
  const [data, setData] = useState(initialData);
  const [tick, setTick] = useState(0);

  // Auto-refresh timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        No agent connected
      </div>
    );
  }

  const { status, lastHeartbeat, uptimeSince, currentTask } = data;

  const statusConfig = {
    online: { color: "bg-emerald-500", glow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]", text: "text-emerald-400", label: "Online", pulse: true },
    idle: { color: "bg-amber-500", glow: "shadow-[0_0_8px_rgba(245,158,11,0.5)]", text: "text-amber-400", label: "Idle", pulse: false },
    offline: { color: "bg-zinc-500", glow: "", text: "text-zinc-500", label: "Offline", pulse: false },
  };

  const cfg = statusConfig[status];

  return (
    <div className="space-y-3">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} ${cfg.glow}`} />
            {cfg.pulse && (
              <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${cfg.color} animate-ping opacity-40`} />
            )}
          </div>
          <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
        </div>
        {status !== "offline" ? (
          <Wifi className="w-4 h-4 text-emerald-500/50" />
        ) : (
          <WifiOff className="w-4 h-4 text-zinc-600" />
        )}
      </div>

      {/* Current task */}
      {currentTask && (
        <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400/70 uppercase font-semibold">Now Processing</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{currentTask}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        {lastHeartbeat && (
          <div className="flex items-center gap-1 text-zinc-500">
            <Activity className="w-3 h-3" />
            <span>Heartbeat {timeAgo(lastHeartbeat)}</span>
          </div>
        )}
        {uptimeSince && (
          <div className="flex items-center gap-1 text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>Up {uptimeDuration(uptimeSince)}</span>
          </div>
        )}
      </div>

      {/* Live indicator */}
      {status === "online" && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500/50">
          <RefreshCw className="w-2.5 h-2.5" />
          <span>Live</span>
        </div>
      )}
    </div>
  );
}
