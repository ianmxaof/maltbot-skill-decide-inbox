"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDecideInboxData } from "@/hooks/useDecideInboxData";
import { usePair } from "@/hooks/usePair";
import { useDisclosure } from "@/hooks/useDisclosure";
import {
  Home,
  Inbox,
  Globe,
  Sparkles,
  Bot,
  Settings,
} from "lucide-react";

interface Tab {
  label: string;
  short: string;
  href: string;
  icon: React.ReactNode;
  badgeKey?: "decide";
  isNew?: boolean;
  matchPrefix?: boolean;
}

export function DashboardTabs() {
  const pathname = usePathname();
  const { pendingCount } = useDecideInboxData();
  const { activePairId } = usePair();
  const { state: disclosure, loading } = useDisclosure(activePairId);

  const isSettings = pathname.startsWith("/settings");

  // Build visible tabs based on disclosure state
  const tabs: Tab[] = [
    {
      label: "Home",
      short: "Home",
      href: "/home",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Inbox",
      short: "Inbox",
      href: "/decide",
      icon: <Inbox className="w-4 h-4" />,
      badgeKey: "decide",
    },
  ];

  // Network — visible after 'networked' stage (or full_citizen)
  if (!disclosure || disclosure.features.network_feed) {
    tabs.push({
      label: "Network",
      short: "Network",
      href: "/network",
      icon: <Globe className="w-4 h-4" />,
      isNew: disclosure ? !disclosure.visitedFeatures.includes("network") && disclosure.features.network_feed : false,
      matchPrefix: true,
    });
  }

  // Space — visible after 'daily_driver' stage
  if (!disclosure || disclosure.features.space) {
    const spaceHref = activePairId ? `/space/${activePairId}` : "/settings";
    tabs.push({
      label: "Space",
      short: "Space",
      href: spaceHref,
      icon: <Sparkles className="w-4 h-4" />,
      isNew: disclosure ? !disclosure.visitedFeatures.includes("space") && disclosure.features.space : false,
    });
  }

  // Workers — always visible after onboarding
  if (!disclosure || disclosure.features.workers) {
    tabs.push({
      label: "Workers",
      short: "Workers",
      href: "/workers",
      icon: <Bot className="w-4 h-4" />,
    });
  }

  return (
    <nav
      className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/50 px-4 overflow-x-auto"
      aria-label="Dashboard sections"
    >
      {tabs.map((tab) => {
        const isActive = tab.matchPrefix
          ? pathname.startsWith(tab.href)
          : tab.href === "/home"
            ? pathname === "/home" || pathname.startsWith("/projects/")
            : tab.href.startsWith("/space/")
              ? pathname.startsWith("/space/")
              : pathname === tab.href;

        const badge =
          tab.badgeKey === "decide" && pendingCount > 0
            ? pendingCount
            : null;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t px-3 py-2.5 text-sm font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              isActive
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </span>
            {badge != null && (
              <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                {badge}
              </span>
            )}
            {tab.isNew && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/20 text-violet-400 rounded">
                new
              </span>
            )}
          </Link>
        );
      })}

      <Link
        href="/settings"
        className={`ml-auto rounded-t p-2.5 text-sm transition ${
          isSettings
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }`}
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </Link>
    </nav>
  );
}
