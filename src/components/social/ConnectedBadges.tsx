"use client";

import { useState, useEffect } from "react";
import {
  Flame, Music, Github, MessageSquare, Cloud, Globe,
  BookMarked, Highlighter, MessageCircle,
} from "lucide-react";
import type { ConnectedIntegration } from "@/types/integration";

interface Props {
  pairId: string;
}

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  hackernews: Flame,
  spotify: Music,
  github_profile: Github,
  reddit: MessageSquare,
  bluesky: Cloud,
  mastodon: Globe,
  pocket: BookMarked,
  readwise: Highlighter,
  discord: MessageCircle,
};

const PROVIDER_COLORS: Record<string, string> = {
  hackernews: "#ff6600",
  spotify: "#1DB954",
  github_profile: "#f0f6fc",
  reddit: "#FF4500",
  bluesky: "#0085FF",
  mastodon: "#6364FF",
  pocket: "#EF4056",
  readwise: "#F5C518",
  discord: "#5865F2",
};

const PROVIDER_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  spotify: "Spotify",
  github_profile: "GitHub",
  reddit: "Reddit",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  pocket: "Pocket",
  readwise: "Readwise",
  discord: "Discord",
};

export function ConnectedBadges({ pairId }: Props) {
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);

  useEffect(() => {
    fetch(`/api/integrations?pairId=${encodeURIComponent(pairId)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setIntegrations(res.integrations.filter((i: ConnectedIntegration) => i.active && i.showOnProfile));
        }
      })
      .catch(() => {});
  }, [pairId]);

  if (integrations.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {integrations.map(integration => {
        const Icon = PROVIDER_ICONS[integration.providerId] ?? Globe;
        const color = PROVIDER_COLORS[integration.providerId] ?? "#888";
        const label = PROVIDER_LABELS[integration.providerId] ?? integration.providerId;

        return (
          <div
            key={integration.id}
            className="group relative flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110"
            style={{ backgroundColor: color + "20" }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {label}: {integration.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
