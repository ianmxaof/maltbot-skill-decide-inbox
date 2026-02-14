"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["decisionChart"];
  accentColor: string;
}

export function DecisionChartWidget({ data, accentColor }: Props) {
  if (!data || data.total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        No decisions yet
      </div>
    );
  }

  const { approved, ignored, escalated, total } = data;
  const approvedPct = Math.round((approved / total) * 100);
  const ignoredPct = Math.round((ignored / total) * 100);
  const escalatedPct = Math.round((escalated / total) * 100);

  // Simple horizontal stacked bar
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-zinc-800">
        {approvedPct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${approvedPct}%`, backgroundColor: "#22c55e" }}
          />
        )}
        {ignoredPct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${ignoredPct}%`, backgroundColor: "#71717a" }}
          />
        )}
        {escalatedPct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${escalatedPct}%`, backgroundColor: "#f59e0b" }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-zinc-400">Approved</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">{approvedPct}%</div>
          <div className="text-[10px] text-zinc-600">{approved}</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <XCircle className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-400">Ignored</span>
          </div>
          <div className="text-lg font-bold text-zinc-400">{ignoredPct}%</div>
          <div className="text-[10px] text-zinc-600">{ignored}</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-zinc-400">Escalated</span>
          </div>
          <div className="text-lg font-bold text-amber-400">{escalatedPct}%</div>
          <div className="text-[10px] text-zinc-600">{escalated}</div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] text-zinc-600">{total} total decisions</span>
      </div>
    </div>
  );
}
