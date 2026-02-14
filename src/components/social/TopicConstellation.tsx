"use client";

import { useMemo } from "react";
import type { TopicNode } from "@/types/social";

interface Props {
  nodes: TopicNode[];
  accentColor: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  code: "#60a5fa",       // blue
  feed: "#fb923c",       // orange
  discussion: "#a78bfa", // violet
  focus: "#34d399",      // emerald
};

const CATEGORY_LABELS: Record<string, string> = {
  code: "Code",
  feed: "Feeds",
  discussion: "Discussion",
  focus: "Focus",
};

/**
 * Force-directed-ish constellation of topics.
 * Uses a simple radial layout with category clusters.
 */
export function TopicConstellation({ nodes, accentColor }: Props) {
  const layout = useMemo(() => {
    if (nodes.length === 0) return [];

    const width = 320;
    const height = 240;
    const cx = width / 2;
    const cy = height / 2;

    // Group by category
    const categories = new Map<string, TopicNode[]>();
    for (const n of nodes) {
      const arr = categories.get(n.category) ?? [];
      arr.push(n);
      categories.set(n.category, arr);
    }

    // Assign each category a sector
    const catList = [...categories.keys()];
    const sectorAngle = (2 * Math.PI) / Math.max(catList.length, 1);

    const positions: Array<{
      node: TopicNode;
      x: number;
      y: number;
      color: string;
    }> = [];

    catList.forEach((cat, ci) => {
      const catNodes = categories.get(cat) ?? [];
      const baseAngle = ci * sectorAngle - Math.PI / 2;

      catNodes.forEach((node, ni) => {
        // Spread within sector
        const spread = sectorAngle * 0.6;
        const angle = baseAngle + (ni / Math.max(catNodes.length, 1)) * spread - spread / 2;
        const radius = 40 + node.weight * 60 + (ni % 2) * 20;

        positions.push({
          node,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          color: CATEGORY_COLORS[cat] ?? accentColor,
        });
      });
    });

    return positions;
  }, [nodes, accentColor]);

  if (nodes.length === 0) return null;

  const width = 320;
  const height = 240;

  // Collect unique categories present
  const presentCategories = Array.from(new Set(nodes.map(n => n.category)));

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Topic Constellation
      </div>

      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
        <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
          {/* Connection lines */}
          {layout.map(({ node, x, y, color }) =>
            node.connections.slice(0, 3).map(targetId => {
              const target = layout.find(l => l.node.id === targetId);
              if (!target) return null;
              // Only draw once (lower id draws)
              if (node.id > targetId) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={x}
                  y1={y}
                  x2={target.x}
                  y2={target.y}
                  stroke={color}
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
              );
            })
          )}

          {/* Nodes */}
          {layout.map(({ node, x, y, color }) => {
            const r = 3 + node.weight * 8;
            return (
              <g key={node.id}>
                {/* Glow */}
                <circle cx={x} cy={y} r={r + 4} fill={color} opacity={0.08} />
                {/* Node */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  opacity={0.6 + node.weight * 0.3}
                  className="transition-all hover:opacity-100"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y + r + 10}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[8px]"
                  style={{ fontSize: "8px" }}
                >
                  {node.label.length > 16 ? node.label.slice(0, 14) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {presentCategories.map(cat => (
          <div key={cat} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[cat] ?? accentColor }}
            />
            <span className="text-[10px] text-zinc-600">
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
          </div>
        ))}
        <span className="text-[10px] text-zinc-700">
          {nodes.length} topics
        </span>
      </div>
    </div>
  );
}
