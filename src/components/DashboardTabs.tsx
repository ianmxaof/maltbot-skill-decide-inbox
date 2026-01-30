"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Context Hub", short: "Context" },
  { href: "/feeds", label: "Signal Feeds", short: "Feeds" },
  { href: "/decide", label: "Decide Inbox", short: "Decide" },
  { href: "/security", label: "Security", short: "Security" },
  { href: "/timeline", label: "Agent Timeline", short: "Timeline" },
  { href: "/radar", label: "CI/CR Radar", short: "Radar" },
  { href: "/skills", label: "Skills", short: "Skills" },
] as const;

export function DashboardTabs() {
  const pathname = usePathname();

  const isProjectDetail = pathname.startsWith("/projects/");
  const activeHref = isProjectDetail ? "/" : pathname;

  return (
    <nav className="flex gap-1 border-b border-zinc-800 bg-zinc-900/50 px-4" aria-label="Dashboard sections">
      {TABS.map(({ href, label, short }) => {
        const isActive = href === "/" ? activeHref === "/" || isProjectDetail : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-t px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
            title={label}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
