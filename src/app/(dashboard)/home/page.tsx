"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePair } from "@/hooks/usePair";
import { useDecideInboxData } from "@/hooks/useDecideInboxData";
import {
  AgentStatusCard,
  ActivityHeatmap,
  RecentActionsBlock,
  QuickActionsBar,
} from "@/components/dashboard";
import { Inbox } from "lucide-react";
import type { DecideInboxItem } from "@/types/dashboard";

function decideItemTitle(item: DecideInboxItem): string {
  if ("title" in item && typeof item.title === "string") return item.title;
  if ("whatChanged" in item && typeof item.whatChanged === "string") return item.whatChanged;
  if ("summary" in item && typeof item.summary === "string") return item.summary;
  return "Pending";
}

function decideItemReasoning(item: DecideInboxItem): string {
  if ("reasoning" in item && typeof item.reasoning === "string") return item.reasoning;
  if ("whyItMatters" in item && typeof item.whyItMatters === "string") return item.whyItMatters;
  if ("description" in item && typeof item.description === "string") return item.description;
  return "";
}

function DashboardContent() {
  const { pair, activePairId, loading } = usePair();
  const { items: decideItems, loading: decideLoading } = useDecideInboxData();

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-zinc-500">Loading dashboard…</p>
      </main>
    );
  }

  const humanName = pair?.humanName ?? "Operator";
  const heartbeatInterval = pair?.activityPattern?.heartbeatIntervalMinutes ?? 30;
  const contextSources = pair?.contextSources;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          The Nightly Build
        </h2>
        <p className="mt-1 text-xl text-white">
          Welcome back, {humanName}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AgentStatusCard
          humanName={humanName}
          heartbeatIntervalMinutes={heartbeatInterval}
          contextSources={contextSources}
        />
        <ActivityHeatmap />
      </div>

      <section className="mb-6">
        <RecentActionsBlock limit={5} />
      </section>

      <section className="mb-6">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Decide Inbox
            </h3>
            <Link
              href="/decide"
              className="text-xs text-amber-500/80 hover:text-amber-400"
            >
              View All
            </Link>
          </div>
          {decideLoading ? (
            <p className="mt-2 text-sm text-zinc-500">Loading…</p>
          ) : decideItems.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              No pending items. New proposals will appear here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {decideItems.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href="/decide"
                    className="block rounded border border-zinc-700 p-3 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  >
                    <p className="font-medium truncate">{decideItemTitle(item)}</p>
                    <p className="text-xs text-zinc-500 mt-1 truncate">
                      {decideItemReasoning(item) || "No reasoning"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Quick actions</h3>
        <QuickActionsBar pairId={activePairId ?? undefined} />
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-zinc-500">Loading…</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
