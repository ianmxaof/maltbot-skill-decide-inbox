"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePair } from "@/hooks/usePair";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useDecideInboxData } from "@/hooks/useDecideInboxData";
import {
  AgentStatusCard,
  ActivityHeatmap,
  RecentActionsBlock,
  QuickActionsBar,
} from "@/components/dashboard";
import {
  Inbox,
  Loader2,
  Users,
  AlertTriangle,
  Sparkles,
  Moon,
  Shield,
  FileText,
  Key,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { DecideInboxItem } from "@/types/dashboard";
import type { DailyDigest } from "@/lib/daily-digest";

// ─── Helpers ─────────────────────────────────────────────

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

// ─── First-Scan Loading State ────────────────────────────

function FirstScanBanner({ pairId }: { pairId: string }) {
  const [scanning, setScanning] = useState(true);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/workers/ingest?pairId=${encodeURIComponent(pairId)}&status=pending`
        );
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        if (items.length > 0) {
          setItemCount(items.length);
          setScanning(false);
          return true;
        }
      } catch {}
      return false;
    };

    // Poll every 3 seconds for up to 60 seconds
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      const found = await poll();
      if (found || count >= 20 || cancelled) {
        clearInterval(interval);
        if (!found) setScanning(false);
      }
    }, 3000);

    // Initial check
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pairId]);

  if (!scanning && itemCount === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
      {scanning ? (
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Your agent is scanning your sources...
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              This takes about a minute. Items will appear below.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                {itemCount} item{itemCount === 1 ? "" : "s"} need your attention
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Your agent found these from your sources.
              </p>
            </div>
          </div>
          <Link
            href="/decide"
            className="px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition"
          >
            Review now
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Cooling Banner ──────────────────────────────────────

function CoolingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-6 mb-6 text-center">
      <Moon className="w-8 h-8 text-amber-400 mx-auto mb-3" />
      <h3 className="text-base font-semibold text-white mb-2">
        Your agent is running.
      </h3>
      <p className="text-sm text-zinc-400 max-w-md mx-auto mb-4">
        You&apos;ve made your first decisions. Your agent will keep scanning
        your sources and surface new items as they appear. We&apos;ll notify
        you when something needs your attention.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── Celebration Modal ───────────────────────────────────

const CELEBRATIONS: Record<string, { title: string; body: string; cta?: { label: string; href: string } }> = {
  daily_driver: {
    title: "Your Space is now live",
    body: "You've made enough decisions for the platform to generate a profile. See how your governance style looks to others.",
    cta: { label: "See your Space", href: "/space" },
  },
  networked: {
    title: "You're not alone",
    body: "Your governance fingerprint is now rich enough to find people who make similar decisions. Explore your network.",
    cta: { label: "See your network", href: "/network" },
  },
  deep: {
    title: "Pulse, Groups, and Signals are live",
    body: "Your network has enough depth for emergent patterns. See the heartbeat of your network's activity.",
  },
  full_citizen: {
    title: "All features unlocked",
    body: "Welcome to the full Nightly Build experience. Every tool is at your disposal.",
  },
};

function CelebrationModal({
  stage,
  pairId,
  onDismiss,
}: {
  stage: string;
  pairId: string;
  onDismiss: () => void;
}) {
  const celebration = CELEBRATIONS[stage];
  if (!celebration) return null;

  const ctaHref =
    celebration.cta?.href === "/space"
      ? `/space/${pairId}`
      : celebration.cta?.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md w-full rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center shadow-2xl">
        <Sparkles className="w-10 h-10 text-violet-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">
          {celebration.title}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">{celebration.body}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Got it
          </button>
          {celebration.cta && ctaHref && (
            <Link
              href={ctaHref}
              onClick={onDismiss}
              className="px-4 py-2 text-sm rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition"
            >
              {celebration.cta.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Network Preview (networked+) ───────────────────────

function NetworkPreview({ pairId }: { pairId: string }) {
  const [feedCount, setFeedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/social/feed?viewerPairId=${encodeURIComponent(pairId)}&limit=5`)
      .then((r) => r.json())
      .then((d) => setFeedCount(d.activities?.length ?? 0))
      .catch((e) => console.error("[home/NetworkPreview] fetch feed failed:", e));
  }, [pairId]);

  if (feedCount === null) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Users className="w-4 h-4" />
          Network
        </h3>
        <Link
          href="/network"
          className="text-xs text-violet-500/80 hover:text-violet-400"
        >
          View All
        </Link>
      </div>
      {feedCount > 0 ? (
        <p className="mt-2 text-sm text-zinc-400">
          {feedCount} recent activit{feedCount === 1 ? "y" : "ies"} in your
          network.
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          Follow pairs in{" "}
          <Link
            href="/network/discover"
            className="text-violet-400 underline"
          >
            Discover
          </Link>{" "}
          to see their activity here.
        </p>
      )}
    </div>
  );
}

// ─── Convergence Alerts (deep+) ─────────────────────────

function ConvergenceAlerts() {
  const [signals, setSignals] = useState<
    { id: string; type: string; description: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/network/signals?limit=3")
      .then((r) => r.json())
      .then((d) => {
        const items = d.convergences ?? d.signals ?? [];
        setSignals(Array.isArray(items) ? items.slice(0, 3) : []);
      })
      .catch((e) => console.error("[home/ConvergenceAlerts] fetch signals failed:", e));
  }, []);

  if (signals.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        Convergence Alerts
      </h3>
      <ul className="space-y-2">
        {signals.map((s) => (
          <li key={s.id} className="text-sm text-zinc-400">
            {s.description ?? s.type}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Morning Briefing Panel ─────────────────────────────

function MorningBriefing({ pairId }: { pairId: string }) {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchDigest = useCallback(async () => {
    try {
      const res = await fetch(`/api/digest?pairId=${encodeURIComponent(pairId)}`);
      const data = await res.json();
      setDigest(data.digest ?? null);
    } catch {
      // no digest yet
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => { fetchDigest(); }, [fetchDigest]);

  const generateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId }),
      });
      const data = await res.json();
      if (data.digest) setDigest(data.digest);
    } catch (e) {
      console.error("[MorningBriefing] generate failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  const SECTION_ICONS: Record<string, React.ReactNode> = {
    inbox: <Inbox className="w-3.5 h-3.5" />,
    shield: <Shield className="w-3.5 h-3.5" />,
    lock: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
    key: <Key className="w-3.5 h-3.5 text-amber-400" />,
    clipboard: <FileText className="w-3.5 h-3.5 text-violet-400" />,
    cpu: <Loader2 className="w-3.5 h-3.5 text-blue-400" />,
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          Morning Briefing
        </h3>
        <div className="flex items-center gap-2">
          {digest && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          <button
            type="button"
            onClick={generateNow}
            disabled={generating}
            className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition disabled:opacity-50"
          >
            {generating ? "Generating..." : digest ? "Refresh" : "Generate"}
          </button>
        </div>
      </div>

      {digest ? (
        <>
          {/* Health bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${digest.healthScore}%`,
                  backgroundColor:
                    digest.healthScore >= 80 ? "#22c55e" : digest.healthScore >= 50 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <span className="text-xs text-zinc-400">{digest.healthScore}% health</span>
          </div>

          {/* Summary */}
          <p className="text-xs text-zinc-400 mb-2">{digest.summary}</p>

          {/* Action items */}
          {digest.actionItems.length > 0 && (
            <div className="mb-2">
              {digest.actionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-400 mb-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Expanded sections */}
          {expanded && (
            <div className="mt-3 space-y-3 border-t border-zinc-700 pt-3">
              {digest.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1">
                    {SECTION_ICONS[section.icon] ?? <Shield className="w-3.5 h-3.5" />}
                    {section.title}
                    {section.severity === "critical" && (
                      <span className="text-[10px] px-1 rounded bg-red-500/20 text-red-400 ml-1">critical</span>
                    )}
                    {section.severity === "warning" && (
                      <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400 ml-1">warning</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    {section.items.map((item, i) => (
                      <div key={i} className="text-xs text-zinc-500">
                        <span className="text-zinc-400">{item.label}:</span>{" "}
                        <span className="text-zinc-300">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-zinc-600 mt-2">
            Generated {new Date(digest.generatedAt).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          No briefing yet. Click Generate to create your first morning digest.
        </p>
      )}
    </div>
  );
}

// ─── Governance Trust Indicators ────────────────────────

function GovernanceTrustPanel({ pairId }: { pairId: string }) {
  const [auditValid, setAuditValid] = useState<boolean | null>(null);
  const [activePerms, setActivePerms] = useState(0);
  const [activeSpecs, setActiveSpecs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [auditRes, permRes, specRes] = await Promise.all([
          fetch("/api/security/immutable-audit?verify=1"),
          fetch(`/api/security/permissions?pairId=${encodeURIComponent(pairId)}`),
          fetch(`/api/task-specs?pairId=${encodeURIComponent(pairId)}`),
        ]);
        const auditData = await auditRes.json();
        const permData = await permRes.json();
        const specData = await specRes.json();

        setAuditValid(auditData.valid ?? true);
        setActivePerms(permData.permissions?.length ?? 0);
        setActiveSpecs(
          (specData.specs ?? []).filter(
            (s: { status: string }) => s.status === "active"
          ).length
        );
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [pairId]);

  if (loading) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-emerald-400" />
        Trust &amp; Governance
      </h3>
      <div className="space-y-2">
        {/* Audit chain */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            {auditValid ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            Audit chain
          </span>
          <span className={auditValid ? "text-emerald-400" : "text-red-400"}>
            {auditValid ? "Intact" : "Tampered"}
          </span>
        </div>
        {/* Active permissions */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Timed permissions
          </span>
          <span className="text-zinc-300">{activePerms} active</span>
        </div>
        {/* Active specs */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            Task specs
          </span>
          <span className="text-zinc-300">{activeSpecs} active</span>
        </div>
        {/* Expiry indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Auto-revocation
          </span>
          <span className="text-emerald-400">Enabled</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────

function DashboardContent() {
  const { pair, activePairId, loading } = usePair();
  const {
    state: disclosure,
    loading: disclosureLoading,
    dismissCooldown,
    clearCelebration,
  } = useDisclosure(activePairId);
  const { items: decideItems, loading: decideLoading } = useDecideInboxData();

  if (loading || disclosureLoading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-zinc-500">Loading dashboard...</p>
      </main>
    );
  }

  const humanName = pair?.humanName ?? "Operator";
  const heartbeatInterval =
    pair?.activityPattern?.heartbeatIntervalMinutes ?? 30;
  const contextSources = pair?.contextSources;
  const stage = disclosure?.stage ?? "activation";
  const features = disclosure?.features;

  // Show first-scan banner only during activation with no decisions yet
  const showFirstScan =
    stage === "activation" &&
    disclosure &&
    disclosure.totalDecisions === 0 &&
    activePairId;

  // Show cooling banner after first decisions in activation stage
  const showCooling =
    stage === "activation" &&
    disclosure &&
    disclosure.totalDecisions >= 1 &&
    !disclosure.cooldownBannerDismissed;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Celebration modal */}
      {disclosure?.pendingCelebration &&
        CELEBRATIONS[disclosure.pendingCelebration] && (
          <CelebrationModal
            stage={disclosure.pendingCelebration}
            pairId={activePairId ?? ""}
            onDismiss={clearCelebration}
          />
        )}

      <section className="mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          The Nightly Build
        </h2>
        <p className="mt-1 text-xl text-white">
          Welcome back, {humanName}
        </p>
      </section>

      {/* First-scan loading state */}
      {showFirstScan && <FirstScanBanner pairId={activePairId!} />}

      {/* Cooling period banner */}
      {showCooling && <CoolingBanner onDismiss={dismissCooldown} />}

      {/* Always visible: status + heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AgentStatusCard
          humanName={humanName}
          heartbeatIntervalMinutes={heartbeatInterval}
          contextSources={contextSources}
        />
        <ActivityHeatmap />
      </div>

      {/* Always visible: recent actions */}
      <section className="mb-6">
        <RecentActionsBlock limit={5} />
      </section>

      {/* Always visible: Decide Inbox preview */}
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
            <p className="mt-2 text-sm text-zinc-500">Loading...</p>
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
                    <p className="font-medium truncate">
                      {decideItemTitle(item)}
                    </p>
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

      {/* Morning Briefing — always visible after activation */}
      {stage !== "onboarding" && activePairId && (
        <section className="mb-6">
          <MorningBriefing pairId={activePairId} />
        </section>
      )}

      {/* daily_driver+: governance stats + trust indicators */}
      {features?.space && disclosure && (
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                Your Governance
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-lg font-bold text-white">
                    {disclosure.totalDecisions}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase">
                    Decisions
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {disclosure.daysActive}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase">
                    Days Active
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {disclosure.totalWorkerItems}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase">
                    Items Surfaced
                  </p>
                </div>
              </div>
            </div>
            {activePairId && <GovernanceTrustPanel pairId={activePairId} />}
          </div>
        </section>
      )}

      {/* networked+: network preview */}
      {features?.network_feed && activePairId && (
        <section className="mb-6">
          <NetworkPreview pairId={activePairId} />
        </section>
      )}

      {/* deep+: convergence alerts */}
      {features?.network_signals && (
        <section className="mb-6">
          <ConvergenceAlerts />
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-2">
          Quick actions
        </h3>
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
          <p className="text-zinc-500">Loading...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
