"use client";

import { Rocket, CheckCircle } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["shippedThisWeek"];
  accentColor: string;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function ShippedThisWeekWidget({ data, accentColor }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-zinc-600 gap-1">
        <Rocket className="w-5 h-5 text-zinc-700" />
        Nothing shipped this week yet
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
      {data.slice(0, 6).map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-300 leading-tight">{item.summary}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-zinc-600">{item.action}</span>
              <span className="text-[10px] text-zinc-700">&middot;</span>
              <span className="text-[10px] text-zinc-600">{dayLabel(item.shippedAt)}</span>
            </div>
          </div>
        </div>
      ))}
      {data.length > 6 && (
        <div className="text-center">
          <span className="text-[10px] text-zinc-600">+{data.length - 6} more this week</span>
        </div>
      )}
    </div>
  );
}
