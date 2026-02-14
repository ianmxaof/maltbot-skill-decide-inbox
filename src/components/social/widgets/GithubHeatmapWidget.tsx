"use client";

import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["githubHeatmap"];
  accentColor: string;
}

/**
 * Simple 7-row heatmap grid showing activity over the last ~12 weeks.
 * Cells are colored by activity level, from empty to accent color.
 */
export function GithubHeatmapWidget({ data, accentColor }: Props) {
  if (!data || data.contributions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        No GitHub activity
      </div>
    );
  }

  const { contributions, totalContributions, repos } = data;

  // Build a map of date -> count
  const countMap = new Map<string, number>();
  let maxCount = 1;
  for (const c of contributions) {
    countMap.set(c.date, c.count);
    if (c.count > maxCount) maxCount = c.count;
  }

  // Generate last 84 days (12 weeks × 7 days)
  const cells: Array<{ date: string; count: number; level: number }> = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = countMap.get(dateStr) ?? 0;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
    cells.push({ date: dateStr, count, level });
  }

  // Color levels based on accent color
  const levelOpacity = ["05", "20", "40", "70", "ff"];

  return (
    <div className="space-y-3">
      {/* Heatmap grid: 7 rows (days of week) × 12 columns (weeks) */}
      <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
        {cells.map((cell) => (
          <div
            key={cell.date}
            className="w-3 h-3 rounded-sm transition-colors"
            style={{
              backgroundColor: cell.level === 0
                ? "#27272a"
                : `${accentColor}${levelOpacity[cell.level]}`,
            }}
            title={`${cell.date}: ${cell.count} events`}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{totalContributions} events tracked</span>
        <span>{repos.length} repos</span>
      </div>
    </div>
  );
}
