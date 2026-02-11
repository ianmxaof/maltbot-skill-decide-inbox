"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDecideInboxData } from "@/hooks/useDecideInboxData";
import { Settings } from "lucide-react";

const TABS = [
  { href: "/home", label: "Dashboard", short: "Home" },
  { href: "/command", label: "Direct to Agent", short: "Command" },
  { href: "/decide", label: "Decide Inbox", short: "Decide", badgeKey: "decide" as const },
  { href: "/network", label: "Network", short: "Network" },
  { href: "/network/discover", label: "Discover", short: "Discover" },
  { href: "/network/pulse", label: "Pulse", short: "Pulse" },
  { href: "/network/groups", label: "Groups", short: "Groups" },
  { href: "/network/signals", label: "Signals", short: "Signals" },
  { href: "/activity", label: "Activity", short: "Activity" },
  { href: "/workers", label: "Workers", short: "Workers" },
  { href: "/moltbook", label: "Moltbook", short: "Moltbook" },
  { href: "/security", label: "Security", short: "Security" },
  { href: "/command-center", label: "Command Center", short: "CC" },
] as const;

export function DashboardTabs() {
  const pathname = usePathname();
  const { pendingCount } = useDecideInboxData();

  const isProjectDetail = pathname.startsWith("/projects/");
  const activeHref = isProjectDetail ? "/home" : pathname;
  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/50 px-4" aria-label="Dashboard sections">
      {TABS.map((tab) => {
        const { href, label, short } = tab;
        const badgeKey = "badgeKey" in tab ? tab.badgeKey : undefined;
        const isActive = href === "/home"
          ? activeHref === "/home" || isProjectDetail
          : href === "/network"
            ? pathname === "/network"
            : pathname.startsWith(href);
        const badge = badgeKey === "decide" && pendingCount > 0 ? pendingCount : null;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-t px-3 py-2.5 text-sm font-medium transition flex items-center gap-1.5 ${
              isActive
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
            title={label}
          >
            <span>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </span>
            {badge != null && (
              <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href="/settings"
        className={`ml-auto rounded-t p-2.5 text-sm transition ${
          isSettings ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }`}
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </Link>
    </nav>
  );
}
