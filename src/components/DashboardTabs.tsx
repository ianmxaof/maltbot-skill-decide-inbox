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

  const tabContent = tabs.map((tab) => {
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
        className={`rounded-t px-3 py-2.5 text-sm font-medium transition flex items-center gap-1.5 whitespace-nowrap min-touch sm:min-h-0 sm:min-w-0 ${
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
  });

  return (
    <>
      {/* Top nav: desktop and scroll on mobile */}
      <nav
        className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/50 px-2 sm:px-4 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]"
        aria-label="Dashboard sections"
      >
        {tabContent}
        <Link
          href="/settings"
          className={`ml-auto shrink-0 rounded-t p-2.5 min-touch sm:min-h-0 sm:min-w-0 text-sm transition flex items-center justify-center ${
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
      {/* Mobile: fixed bottom nav for thumb reach (only when dashboard has tabs) */}
      {tabs.length > 0 && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-zinc-800 bg-zinc-950/95 backdrop-blur sm:hidden safe-area-pb"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          aria-label="Mobile navigation"
        >
          {tabs.slice(0, 5).map((tab) => {
            const isActive = tab.matchPrefix
              ? pathname.startsWith(tab.href)
              : tab.href === "/home"
                ? pathname === "/home" || pathname.startsWith("/projects/")
                : tab.href.startsWith("/space/")
                  ? pathname.startsWith("/space/")
                  : pathname === tab.href;
            const badge = tab.badgeKey === "decide" && pendingCount > 0 ? pendingCount : null;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center min-touch flex-1 py-2 text-xs transition ${
                  isActive ? "text-amber-400" : "text-zinc-500"
                }`}
                title={tab.label}
              >
                <span className="relative inline-flex">
                  {tab.icon}
                  {badge != null && (
                    <span className="absolute -top-1 -right-2 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] bg-amber-500/20 text-amber-400 rounded">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 truncate max-w-[4rem]">{tab.short}</span>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={`flex flex-col items-center justify-center min-touch flex-1 py-2 text-xs transition ${
              isSettings ? "text-amber-400" : "text-zinc-500"
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="mt-0.5">Settings</span>
          </Link>
        </nav>
      )}
    </>
  );
}
