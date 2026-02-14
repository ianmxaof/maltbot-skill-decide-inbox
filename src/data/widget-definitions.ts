/**
 * Widget Definitions — Registry of all available profile widgets
 *
 * Each widget has metadata for the editor and a default configuration.
 */

import type { WidgetDefinition, WidgetType, ProfileWidget } from "@/types/social";

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  decision_chart: {
    type: "decision_chart",
    name: "Decision Patterns",
    description: "Approve / ignore / escalate breakdown",
    icon: "PieChart",
    defaultSize: "1x1",
    availableSizes: ["1x1", "2x1"],
    requiresData: "decisionChart",
  },
  governance_gauge: {
    type: "governance_gauge",
    name: "Governance Gauge",
    description: "Ship/revert ratio and trust metrics",
    icon: "Gauge",
    defaultSize: "1x1",
    availableSizes: ["1x1", "2x1"],
    requiresData: "governanceGauge",
  },
  agent_uptime: {
    type: "agent_uptime",
    name: "Agent Status",
    description: "Agent online status and current task",
    icon: "Activity",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1"],
    requiresData: "agentUptime",
  },
  rss_ticker: {
    type: "rss_ticker",
    name: "Signal Ticker",
    description: "Live feed of monitored signals",
    icon: "Rss",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1", "2x2"],
    requiresData: "rssTicker",
  },
  github_heatmap: {
    type: "github_heatmap",
    name: "GitHub Activity",
    description: "Contribution heatmap from tracked repos",
    icon: "Github",
    defaultSize: "2x1",
    availableSizes: ["2x1", "2x2"],
    requiresData: "githubHeatmap",
  },
  shipped_this_week: {
    type: "shipped_this_week",
    name: "Shipped This Week",
    description: "Approved agent actions this week",
    icon: "Rocket",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1", "2x2"],
    requiresData: "shippedThisWeek",
  },
  context_map: {
    type: "context_map",
    name: "Context Radar",
    description: "All monitored sources at a glance",
    icon: "Radar",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1", "2x2"],
    requiresData: "contextMap",
  },
  reading_list: {
    type: "reading_list",
    name: "Reading List",
    description: "Bookmarked signals and articles",
    icon: "BookMarked",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1", "2x2"],
    requiresData: "readingList",
  },
  custom_markdown: {
    type: "custom_markdown",
    name: "Custom Block",
    description: "Write anything in Markdown",
    icon: "FileText",
    defaultSize: "2x1",
    availableSizes: ["1x1", "2x1", "1x2", "2x2"],
    requiresData: "",
  },
  hackernews: {
    type: "hackernews",
    name: "Hacker News",
    description: "Your HN karma, submissions, and activity",
    icon: "Flame",
    defaultSize: "2x1",
    availableSizes: ["2x1", "2x2"],
    requiresData: "hackernews",
  },
  spotify: {
    type: "spotify",
    name: "Now Playing",
    description: "Live Spotify: currently playing, top artists, recent tracks",
    icon: "Music",
    defaultSize: "2x1",
    availableSizes: ["2x1", "2x2"],
    requiresData: "spotify",
  },
};

export const WIDGET_LIST = Object.values(WIDGET_DEFINITIONS);

/**
 * Returns the default set of widgets for a new profile.
 * Users can add/remove/reorder from the theme editor.
 */
export function getDefaultWidgets(): ProfileWidget[] {
  return [
    {
      id: "w_decision_chart",
      type: "decision_chart",
      size: "1x1",
      position: 0,
      visible: true,
    },
    {
      id: "w_governance_gauge",
      type: "governance_gauge",
      size: "1x1",
      position: 1,
      visible: true,
    },
    {
      id: "w_agent_uptime",
      type: "agent_uptime",
      size: "2x1",
      position: 2,
      visible: true,
    },
    {
      id: "w_shipped_this_week",
      type: "shipped_this_week",
      size: "2x1",
      position: 3,
      visible: true,
    },
  ];
}
