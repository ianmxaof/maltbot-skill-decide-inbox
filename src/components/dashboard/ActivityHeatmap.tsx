"use client";

/**
 * Activity heatmap placeholder — 24h grid.
 * For MVP, shows a simple stub; can be wired to activity-feed data later.
 */

import { Grid3X3 } from "lucide-react";

export function ActivityHeatmap() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const placeholder = true; // stub for MVP

  if (placeholder) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Grid3X3 className="w-4 h-4 text-zinc-500" />
          Activity (24h)
        </div>
        <p className="mt-2 text-sm text-zinc-500">Coming soon</p>
        <p className="text-xs text-zinc-600 mt-1">
          Heatmap will show activity by hour
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Grid3X3 className="w-4 h-4 text-zinc-500" />
        Activity (24h)
      </div>
      <div className="mt-3 grid grid-cols-12 gap-1">
        {hours.map((h) => (
          <div
            key={h}
            className="aspect-square rounded bg-zinc-800/50"
            title={`${h}:00`}
          />
        ))}
      </div>
    </div>
  );
}
