"use client";

import { useState, useCallback } from "react";
import {
  GripVertical, PieChart, Gauge, Activity, Rss, Github,
  Rocket, Radar, BookMarked, FileText, Flame, Music,
} from "lucide-react";
import type { ProfileWidget, WidgetDataPayload, WidgetType } from "@/types/social";
import { WIDGET_DEFINITIONS } from "@/data/widget-definitions";
import { DecisionChartWidget } from "./widgets/DecisionChartWidget";
import { GovernanceGaugeWidget } from "./widgets/GovernanceGaugeWidget";
import { AgentUptimeWidget } from "./widgets/AgentUptimeWidget";
import { RssTickerWidget } from "./widgets/RssTickerWidget";
import { GithubHeatmapWidget } from "./widgets/GithubHeatmapWidget";
import { ShippedThisWeekWidget } from "./widgets/ShippedThisWeekWidget";
import { ContextMapWidget } from "./widgets/ContextMapWidget";
import { ReadingListWidget } from "./widgets/ReadingListWidget";
import { CustomMarkdownWidget } from "./widgets/CustomMarkdownWidget";
import { HackerNewsWidget } from "./widgets/HackerNewsWidget";
import { SpotifyNowPlayingWidget } from "./widgets/SpotifyNowPlayingWidget";

// ── Icon map ──
const WIDGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PieChart, Gauge, Activity, Rss, Github, Rocket, Radar, BookMarked, FileText, Flame, Music,
};

// ── Size → CSS class mapping ──
function sizeClasses(size: string): string {
  switch (size) {
    case "1x1": return "col-span-1 row-span-1";
    case "2x1": return "col-span-2 row-span-1";
    case "1x2": return "col-span-1 row-span-2";
    case "2x2": return "col-span-2 row-span-2";
    default: return "col-span-1 row-span-1";
  }
}

// ── Widget renderer (maps type to component) ──
function renderWidget(
  widget: ProfileWidget,
  data: WidgetDataPayload,
  accentColor: string,
  pairId?: string
): React.ReactNode {
  switch (widget.type) {
    case "decision_chart":
      return <DecisionChartWidget data={data.decisionChart} accentColor={accentColor} />;
    case "governance_gauge":
      return <GovernanceGaugeWidget data={data.governanceGauge} accentColor={accentColor} />;
    case "agent_uptime":
      return <AgentUptimeWidget data={data.agentUptime} accentColor={accentColor} />;
    case "rss_ticker":
      return <RssTickerWidget data={data.rssTicker} accentColor={accentColor} />;
    case "github_heatmap":
      return <GithubHeatmapWidget data={data.githubHeatmap} accentColor={accentColor} />;
    case "shipped_this_week":
      return <ShippedThisWeekWidget data={data.shippedThisWeek} accentColor={accentColor} />;
    case "context_map":
      return <ContextMapWidget data={data.contextMap} accentColor={accentColor} />;
    case "reading_list":
      return <ReadingListWidget data={data.readingList} accentColor={accentColor} />;
    case "custom_markdown":
      return <CustomMarkdownWidget widget={widget} accentColor={accentColor} />;
    case "hackernews":
      return pairId
        ? <HackerNewsWidget pairId={pairId} accentColor={accentColor} />
        : <div className="text-xs text-zinc-600">HN not connected</div>;
    case "spotify":
      return pairId
        ? <SpotifyNowPlayingWidget pairId={pairId} accentColor={accentColor} />
        : <div className="text-xs text-zinc-600">Spotify not connected</div>;
    default:
      return <div className="text-xs text-zinc-600">Unknown widget type</div>;
  }
}

// ── Main WidgetGrid component ──

interface WidgetGridProps {
  widgets: ProfileWidget[];
  data: WidgetDataPayload;
  accentColor: string;
  cardStyle?: string;
  pairId?: string;
}

function cardClasses(cardStyle?: string): string {
  switch (cardStyle) {
    case "glass":
      return "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md";
    case "solid":
      return "rounded-xl border border-zinc-700 bg-zinc-800";
    case "none":
      return "rounded-xl";
    case "outlined":
    default:
      return "rounded-xl border border-zinc-800 bg-zinc-900/50";
  }
}

export function WidgetGrid({ widgets, data, accentColor, cardStyle, pairId }: WidgetGridProps) {
  const visibleWidgets = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.position - b.position);

  if (visibleWidgets.length === 0) return null;

  const card = cardClasses(cardStyle);

  return (
    <div className="mt-5">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Dashboard
      </div>
      <div className="grid grid-cols-2 gap-3 auto-rows-min">
        {visibleWidgets.map(widget => {
          const def = WIDGET_DEFINITIONS[widget.type];
          const Icon = def ? WIDGET_ICONS[def.icon] ?? Radar : Radar;
          const title = widget.title ?? def?.name ?? widget.type;

          return (
            <div
              key={widget.id}
              className={`${sizeClasses(widget.size)} ${card} p-4 transition-all hover:border-zinc-700/80`}
            >
              {/* Widget header */}
              <div className="flex items-center gap-1.5 mb-3">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {title}
                </span>
              </div>

              {/* Widget body */}
              <div className="min-h-[60px]">
                {renderWidget(widget, data, accentColor, pairId)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
