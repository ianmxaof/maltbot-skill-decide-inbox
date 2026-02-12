"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePair } from "@/hooks/usePair";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { CheckCircle2, RotateCcw, Edit3, ChevronDown, ChevronUp, Send } from "lucide-react";
import { SpecBuilder, PermissionsManager } from "@/components/dashboard";

interface Worker {
  id: string;
  name: string;
  pairId: string;
  aspect: string;
  hostname: string;
  platform: string;
  ollamaModel: string;
  status: string;
  version: string;
  registeredAt: string;
  lastHeartbeatAt: string;
  lastActivityAt?: string;
  totalItemsIngested: number;
  totalDecisionsSurfaced: number;
  uptimeSeconds: number;
  tokensProcessed: number;
  capabilities: string[];
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; dot: string }
> = {
  online: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    label: "Online",
    dot: "🟢",
  },
  working: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    label: "Working",
    dot: "🟣",
  },
  idle: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    label: "Idle",
    dot: "🟡",
  },
  offline: {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    label: "Offline",
    dot: "⚫",
  },
  error: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    label: "Error",
    dot: "🔴",
  },
};

const ASPECT_CONFIG: Record<string, { icon: string; label: string }> = {
  golem: { icon: "🪨", label: "Golem" },
  prometheus: { icon: "🔥", label: "Prometheus" },
  odin: { icon: "👁", label: "Odin" },
  hermes: { icon: "⚡", label: "Hermes" },
  custom: { icon: "⚙️", label: "Custom" },
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function WorkerCard({ worker }: { worker: Worker }) {
  const status = STATUS_CONFIG[worker.status] ?? STATUS_CONFIG.offline;
  const aspect = ASPECT_CONFIG[worker.aspect] ?? ASPECT_CONFIG.custom;

  return (
    <div
      className="rounded-xl border border-zinc-700/30 p-5 transition-all hover:border-zinc-600/40"
      style={{ background: status.bg }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center text-lg">
            {aspect.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">
                {worker.name}
              </h3>
              <span className="text-[10px]">{status.dot}</span>
            </div>
            <p className="text-xs text-zinc-500">
              {worker.hostname} · {worker.ollamaModel}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
          style={{ color: status.color, borderColor: `${status.color}30` }}
        >
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-lg font-bold text-zinc-100">
            {worker.totalItemsIngested}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Ingested</p>
        </div>
        <div>
          <p className="text-lg font-bold text-zinc-100">
            {worker.totalDecisionsSurfaced}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Decisions</p>
        </div>
        <div>
          <p className="text-lg font-bold text-zinc-100">
            {formatUptime(worker.uptimeSeconds)}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Uptime</p>
        </div>
        <div>
          <p className="text-lg font-bold text-zinc-100">
            {worker.tokensProcessed > 1000000
              ? `${(worker.tokensProcessed / 1000000).toFixed(1)}M`
              : worker.tokensProcessed > 1000
                ? `${(worker.tokensProcessed / 1000).toFixed(0)}K`
                : worker.tokensProcessed}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Tokens</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {worker.capabilities.map((cap) => (
          <span
            key={cap}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/40 text-zinc-400"
          >
            {cap.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-700/20">
        <span>Last heartbeat: {timeAgo(worker.lastHeartbeatAt)}</span>
        <span>v{worker.version}</span>
      </div>
    </div>
  );
}

function FleetSummary({ workers }: { workers: Worker[] }) {
  const online = workers.filter(
    (w) => w.status === "online" || w.status === "working"
  ).length;
  const totalIngested = workers.reduce(
    (s, w) => s + w.totalItemsIngested,
    0
  );
  const totalDecisions = workers.reduce(
    (s, w) => s + w.totalDecisionsSurfaced,
    0
  );
  const totalTokens = workers.reduce((s, w) => s + w.tokensProcessed, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase">
          Workers
        </p>
        <p className="text-2xl font-bold text-zinc-100 mt-1">
          {online}
          <span className="text-sm text-zinc-500">/{workers.length}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">online</p>
      </div>
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase">
          Items Ingested
        </p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">
          {totalIngested}
        </p>
        <p className="text-xs text-zinc-500 mt-1">total discoveries</p>
      </div>
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase">
          Decisions Surfaced
        </p>
        <p className="text-2xl font-bold text-violet-400 mt-1">
          {totalDecisions}
        </p>
        <p className="text-xs text-zinc-500 mt-1">to Decide Inbox</p>
      </div>
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase">
          Tokens Processed
        </p>
        <p className="text-2xl font-bold text-cyan-400 mt-1">
          {totalTokens > 1000000
            ? `${(totalTokens / 1000000).toFixed(1)}M`
            : `${(totalTokens / 1000).toFixed(0)}K`}
        </p>
        <p className="text-xs text-zinc-500 mt-1">local compute</p>
      </div>
    </div>
  );
}

export default function WorkerFleetPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const { activePairId, pair } = usePair();
  const { state: disclosure } = useDisclosure(activePairId);
  const currentPairId = activePairId ?? pair?.id ?? "";

  const load = useCallback(async () => {
    try {
      const url = currentPairId
        ? `/api/workers/register?pairId=${currentPairId}`
        : "/api/workers/register";
      const res = await fetch(url);
      const data = await res.json();
      setWorkers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load workers:", e);
    } finally {
      setLoading(false);
    }
  }, [currentPairId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Worker Fleet</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Local agent workers connected to your Nightly Build instance
          </p>
        </div>
      </div>

      {workers.length > 0 ? (
        <>
          <FleetSummary workers={workers} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🌙</p>
          <p className="text-lg text-zinc-300 mb-2">No workers connected</p>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
            Workers are local processes that run on your hardware with Ollama.
            They monitor sources, evaluate items with local AI, and push
            discoveries to your Decide Inbox.
          </p>
          {currentPairId && (
            <p className="text-xs text-zinc-500 mb-4 font-mono bg-zinc-800/50 px-3 py-2 rounded inline-block">
              Your pair ID: {currentPairId}
            </p>
          )}
          <div className="bg-zinc-800/50 rounded-xl p-5 max-w-lg mx-auto text-left">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-3">
              Quick Start
            </p>
            <div className="font-mono text-xs text-zinc-300 space-y-1">
              <p className="text-zinc-500"># 1. Install Ollama</p>
              <p>curl -fsSL https://ollama.ai/install.sh | sh</p>
              <p>ollama pull qwen2.5:7b</p>
              <p className="text-zinc-500 mt-3"># 2. Set up worker</p>
              <p>cd nightly-build-worker</p>
              <p>cp worker.env.example .env</p>
              <p className="text-zinc-500">
                # Edit .env with your platform URL and pair ID
              </p>
              <p className="text-zinc-500 mt-3"># 3. Run</p>
              <p>npm install && npm run dev</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task Specs & Permissions ──────────────── */}
      {currentPairId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <SpecBuilder pairId={currentPairId} />
          <PermissionsManager pairId={currentPairId} />
        </div>
      )}

      {/* ─── Activity Feed Section ─────────────────── */}
      <ActivitySection />

      {/* ─── Direct to Agent Section ───────────────── */}
      {disclosure?.features.direct_to_agent && <DirectToAgentSection />}
    </div>
  );
}

// ─── Embedded Activity Feed ──────────────────────────────

function OutcomeIcon({ outcome }: { outcome?: "kept" | "reverted" | "modified" }) {
  switch (outcome) {
    case "kept":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "reverted":
      return <RotateCcw className="w-4 h-4 text-amber-500" />;
    case "modified":
      return <Edit3 className="w-4 h-4 text-blue-500" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-zinc-500" />;
  }
}

function ActivitySection() {
  const { items, loading } = useActivityFeed({ limit: 10 });
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition mb-4"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Activity ({items.length})
      </button>
      {expanded && (
        loading ? (
          <p className="text-sm text-zinc-500">Loading activity...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet. Actions will appear here as your agent works.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 flex items-start gap-3">
                <OutcomeIcon outcome={item.outcome} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.action}</p>
                  {item.reasoning && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.reasoning}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

// ─── Embedded Direct to Agent ────────────────────────────

function DirectToAgentSection() {
  const [expanded, setExpanded] = useState(false);
  const [command, setCommand] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (!command.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/openclaw/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: command }),
      });
      const data = await res.json();
      setResult(data.output ?? data.error ?? JSON.stringify(data));
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition mb-4"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Direct to Agent
      </button>
      {expanded && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Send a command to your agent..."
              className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !command.trim()}
              className="px-3 py-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {result && (
            <pre className="mt-3 text-xs text-zinc-400 bg-zinc-800 rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap">
              {result}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
