"use client";

import { ShieldCheck, Gauge, AlertCircle } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["governanceGauge"];
  accentColor: string;
}

export function GovernanceGaugeWidget({ data, accentColor }: Props) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        No governance data yet
      </div>
    );
  }

  const { shipRevertRatio, riskTolerance, autonomyLevel, totalActions } = data;
  const pct = Math.round(shipRevertRatio * 100);

  // Arc gauge via CSS conic-gradient
  const gaugeColor = pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  const riskColors: Record<string, string> = {
    conservative: "text-emerald-400",
    moderate: "text-amber-400",
    aggressive: "text-red-400",
  };
  const autonomyColors: Record<string, string> = {
    tight: "text-blue-400",
    moderate: "text-violet-400",
    loose: "text-orange-400",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular gauge */}
      <div className="relative w-24 h-24">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(${gaugeColor} ${pct * 3.6}deg, #27272a ${pct * 3.6}deg)`,
          }}
        />
        {/* Inner circle */}
        <div className="absolute inset-2 rounded-full bg-zinc-900 flex items-center justify-center flex-col">
          <span className="text-xl font-bold text-white">{pct}%</span>
          <span className="text-[9px] text-zinc-500 -mt-0.5">ship rate</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="w-full grid grid-cols-2 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <AlertCircle className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase">Risk</span>
          </div>
          <span className={`text-xs font-semibold capitalize ${riskColors[riskTolerance] ?? "text-zinc-400"}`}>
            {riskTolerance}
          </span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <ShieldCheck className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase">Autonomy</span>
          </div>
          <span className={`text-xs font-semibold capitalize ${autonomyColors[autonomyLevel] ?? "text-zinc-400"}`}>
            {autonomyLevel}
          </span>
        </div>
      </div>

      {totalActions > 0 && (
        <div className="text-[10px] text-zinc-600">{totalActions} autonomous actions</div>
      )}
    </div>
  );
}
