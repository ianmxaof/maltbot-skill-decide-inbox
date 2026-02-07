"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDecideInboxData } from "@/hooks/useDecideInboxData";
import type { DecideInboxItem, SignalReference } from "@/types/dashboard";
import { ProjectDecisionCard } from "@/components/decide/ProjectDecisionCard";
import { SocialActionCard } from "@/components/decide/SocialActionCard";
import { DevActionCard } from "@/components/decide/DevActionCard";
import { Pause, Play, RefreshCw, ExternalLink } from "lucide-react";

type Filter = "all" | "project" | "social" | "ci_cr" | "dev" | "signal";

function isProject(item: DecideInboxItem): item is Extract<DecideInboxItem, { category: "project" }> {
  return item.category === "project";
}

function isSocial(item: DecideInboxItem): item is Extract<DecideInboxItem, { category: "social" }> {
  return item.category === "social";
}

function isCICR(item: DecideInboxItem): item is Extract<DecideInboxItem, { category: "ci_cr" }> {
  return item.category === "ci_cr";
}

function isDev(item: DecideInboxItem): item is Extract<DecideInboxItem, { category: "dev" }> {
  return item.category === "dev";
}

function isSignal(item: DecideInboxItem): item is SignalReference {
  return item.category === "signal";
}

function SignalReferenceCard({
  item,
  onAct,
}: {
  item: SignalReference;
  onAct: (id: string, action: "ignore" | "approve" | "deeper") => void;
}) {
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        <span className="rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-400">Signal</span>
        <span className="capitalize">{item.source}</span>
      </div>
      <h3 className="font-medium text-white">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 hover:underline"
          >
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      {item.summary && <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{item.summary}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onAct(item.id, "ignore")}
          aria-label="Ignore"
          className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Ignore
        </button>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        )}
      </div>
    </li>
  );
}

function CICRAlertCard({
  item,
  onAct,
}: {
  item: Extract<DecideInboxItem, { category: "ci_cr" }>;
  onAct: (id: string, action: "ignore" | "approve" | "deeper") => void;
}) {
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        <span className="rounded px-1.5 py-0.5 bg-zinc-700 text-zinc-400">CI/CR</span>
        {item.repo && <span>{item.repo}</span>}
        <span className="rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-400">{item.riskLevel}</span>
      </div>
      <h3 className="font-medium text-white">{item.summary}</h3>
      <p className="mt-2 text-sm text-zinc-400">{item.suggestedAction}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onAct(item.id, "ignore")}
          aria-label="Ignore"
          className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Ignore
        </button>
        <button
          type="button"
          onClick={() => onAct(item.id, "approve")}
          aria-label="Approve"
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500"
        >
          Approve
        </button>
      </div>
    </li>
  );
}

function DecideInboxContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") as Filter | null;
  const filter: Filter =
    filterParam && ["all", "project", "social", "ci_cr", "dev", "signal"].includes(filterParam)
      ? filterParam
      : "all";

  const [frozen, setFrozen] = useState(false);
  const { items, loading, refetch } = useDecideInboxData({ pausePolling: frozen });
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState<string | null>(null);

  const act = async (id: string, action: "ignore" | "approve" | "deeper") => {
    const item = items.find((i) => i.id === id);
    const isSocialWithPayload = item && isSocial(item) && item?.moltbookPayload;
    const isDevItem = item && isDev(item);

    if (action === "approve" && (isSocialWithPayload || isDevItem)) {
      setExecuting(id);
      try {
        const res = await fetch("/api/executor/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          setRemovedIds((prev) => new Set(prev).add(id));
          refetch();
        } else {
          alert(data.error || "Execution failed");
        }
      } catch {
        alert("Request failed");
      } finally {
        setExecuting(null);
      }
      return;
    }

    if (action === "ignore" && (isSocialWithPayload || isDevItem)) {
      try {
        const res = await fetch("/api/decide/ignore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          setRemovedIds((prev) => new Set(prev).add(id));
          refetch();
        } else {
          setRemovedIds((prev) => new Set(prev).add(id));
        }
      } catch {
        setRemovedIds((prev) => new Set(prev).add(id));
      }
      return;
    }

    const isSignalItem = item && isSignal(item);
    if (action === "ignore" && isSignalItem) {
      try {
        const res = await fetch("/api/decide/ignore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          setRemovedIds((prev) => new Set(prev).add(id));
          refetch();
        }
      } catch {
        setRemovedIds((prev) => new Set(prev).add(id));
      }
      return;
    }

    setRemovedIds((prev) => new Set(prev).add(id));
  };

  const visibleItems = items.filter((i) => !removedIds.has(i.id));

  const filteredItems = useMemo(() => {
    if (filter === "all") return visibleItems;
    if (filter === "project") return visibleItems.filter(isProject);
    if (filter === "social") return visibleItems.filter(isSocial);
    if (filter === "ci_cr") return visibleItems.filter(isCICR);
    if (filter === "dev") return visibleItems.filter(isDev);
    if (filter === "signal") return visibleItems.filter(isSignal);
    return visibleItems;
  }, [visibleItems, filter]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Decide Inbox</h2>
        <p className="mt-1 text-zinc-400">
          Single inbox for human decisions. What changed · why it matters · options · risk ·
          recommendation.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Swipe left = ignore · Swipe right = approve · Long press = deeper analysis (UI: use
          buttons below)
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFrozen((f) => !f)}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
              frozen
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
            }`}
            title={frozen ? "Resume auto-refresh" : "Freeze auto-refresh"}
          >
            {frozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {frozen ? "Resume" : "Freeze"}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "project", "social", "signal", "ci_cr", "dev"] as const).map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/decide" : `/decide?filter=${f}`}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-zinc-800 text-white"
                : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {f === "all"
              ? "All"
              : f === "project"
                ? "Project"
                : f === "social"
                  ? "Social"
                  : f === "signal"
                    ? "Signal"
                    : f === "ci_cr"
                      ? "CI/CR"
                      : "Dev"}
          </Link>
        ))}
      </div>

      <ul className="space-y-4">
        {filteredItems.map((item) => {
          if (isProject(item)) {
            return <ProjectDecisionCard key={item.id} item={item} onAct={act} />;
          }
          if (isSocial(item)) {
            return (
              <SocialActionCard
                key={item.id}
                item={item}
                onAct={act}
                isExecuting={executing === item.id}
              />
            );
          }
          if (isCICR(item)) {
            return <CICRAlertCard key={item.id} item={item} onAct={act} />;
          }
          if (isDev(item)) {
            return (
              <DevActionCard
                key={item.id}
                item={item}
                onAct={act}
                isExecuting={executing === item.id}
              />
            );
          }
          if (isSignal(item)) {
            return <SignalReferenceCard key={item.id} item={item} onAct={act} />;
          }
          return null;
        })}
      </ul>

      {loading && filteredItems.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          Loading…
        </p>
      )}
      {!loading && filteredItems.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          {filter === "all"
            ? "Inbox clear. New items appear when your agent proposes actions (social, dev) or you send signals from the Signals panel."
            : `No ${filter} items pending. Try another filter.`}
        </p>
      )}
    </main>
  );
}

export default function DecideInboxPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">Loading…</div>}>
      <DecideInboxContent />
    </Suspense>
  );
}
