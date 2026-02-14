"use client";

import Link from "next/link";
import type { AlignmentCircleNode } from "@/types/social";

interface Props {
  nodes: AlignmentCircleNode[];
  centerLabel: string;
  accentColor: string;
}

/**
 * Radial alignment visualization.
 * Center = the profile pair. Orbiting nodes = aligned pairs.
 * Distance from center = inverse of alignment score.
 * Node size = alignment strength.
 */
export function AlignmentCircle({ nodes, centerLabel, accentColor }: Props) {
  if (nodes.length === 0) return null;

  const size = 280;
  const center = size / 2;
  const maxRadius = center - 40;
  const minRadius = 50;

  // Sort by score descending
  const sorted = [...nodes].sort((a, b) => b.score - a.score);
  const displayed = sorted.slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Alignment Circle
      </div>
      <div className="relative flex items-center justify-center" style={{ height: size, width: size }}>
        {/* Orbit rings */}
        {[0.25, 0.5, 0.75].map(frac => (
          <div
            key={frac}
            className="absolute rounded-full border border-zinc-800/40"
            style={{
              width: maxRadius * 2 * frac + minRadius,
              height: maxRadius * 2 * frac + minRadius,
              left: center - (maxRadius * frac + minRadius / 2),
              top: center - (maxRadius * frac + minRadius / 2),
            }}
          />
        ))}

        {/* Center node */}
        <div
          className="absolute z-10 flex items-center justify-center rounded-full border-2 shadow-lg"
          style={{
            width: 48,
            height: 48,
            left: center - 24,
            top: center - 24,
            borderColor: accentColor,
            backgroundColor: accentColor + "30",
            boxShadow: `0 0 20px ${accentColor}40`,
          }}
        >
          <span className="text-[9px] font-bold text-white text-center leading-tight px-1 truncate max-w-[40px]">
            You
          </span>
        </div>

        {/* Orbiting nodes */}
        {displayed.map((node, i) => {
          const angle = (i / displayed.length) * 2 * Math.PI - Math.PI / 2;
          // Higher score = closer to center
          const distance = minRadius + (1 - node.score) * maxRadius;
          const x = center + Math.cos(angle) * distance;
          const y = center + Math.sin(angle) * distance;
          const nodeSize = 24 + node.score * 16; // 24-40px
          const pct = Math.round(node.score * 100);

          return (
            <Link
              key={node.pairId}
              href={`/space/${node.pairId}`}
              className="absolute z-20 group"
              style={{
                left: x - nodeSize / 2,
                top: y - nodeSize / 2,
              }}
            >
              {/* Connection line */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  left: nodeSize / 2 - (x - center),
                  top: nodeSize / 2 - (y - center),
                  width: size,
                  height: size,
                }}
              >
                <line
                  x1={center - (x - nodeSize / 2)}
                  y1={center - (y - nodeSize / 2)}
                  x2={nodeSize / 2}
                  y2={nodeSize / 2}
                  stroke={node.accentColor || accentColor}
                  strokeOpacity={0.15 + node.score * 0.2}
                  strokeWidth={1}
                />
              </svg>

              {/* Node */}
              <div
                className="rounded-full border flex items-center justify-center transition-all group-hover:scale-125 group-hover:z-30"
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  borderColor: (node.accentColor || "#71717a") + "60",
                  backgroundColor: (node.accentColor || "#27272a") + "30",
                }}
              >
                <span className="text-[8px] font-semibold text-zinc-300 truncate max-w-[36px] text-center">
                  {pct}%
                </span>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-40">
                {node.name} — {pct}% aligned
              </div>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-600">
        <span>closer = more aligned</span>
        <span className="text-zinc-800">&middot;</span>
        <span>{displayed.length} peers shown</span>
      </div>
    </div>
  );
}
