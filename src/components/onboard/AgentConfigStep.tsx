"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rocket, Shield, Search, Clock, ChevronRight, ChevronLeft, Zap, Users, FileText, Info } from "lucide-react";
import {
  getOnboardDraft,
  setOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";
import { PERSONALITY_TEMPLATES, type PersonalityKey } from "@/data/personality-templates";
import { PowerCoreImportCard } from "./PowerCoreImportCard";
import type { OperatingPhilosophy } from "@/types/agent-pair";

const HEARTBEAT_OPTIONS = [15, 30, 60];

const PERSONALITY_ICONS: Record<PersonalityKey, React.ReactNode> = {
  "proactive-builder": <Rocket className="w-5 h-5" />,
  "careful-advisor": <Shield className="w-5 h-5" />,
  "research-assistant": <Search className="w-5 h-5" />,
};

const PHILOSOPHIES: {
  value: OperatingPhilosophy;
  label: string;
  desc: string;
  detail: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "ship-while-sleep",
    label: "Ship While I Sleep",
    desc: "Agent builds proactively, I review in AM",
    detail: "Maximum autonomy. Your agent acts on Tier 1 tasks automatically and queues higher-tier items for your morning review.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    value: "review-before-deploy",
    label: "Collaborative Decision-Making",
    desc: "Agent proposes, I approve before action",
    detail: "Balanced approach. Your agent researches and drafts proposals, but waits for your approval before executing.",
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: "research-only",
    label: "Research & Report Only",
    desc: "Agent gathers intel, doesn't execute",
    detail: "Maximum control. Your agent monitors and analyzes, delivering insights without taking any autonomous action.",
    icon: <FileText className="w-5 h-5" />,
  },
];

export function AgentConfigStep() {
  const [personality, setPersonality] = useState<PersonalityKey>("proactive-builder");
  const [heartbeatMinutes, setHeartbeatMinutes] = useState(30);
  const [operatingPhilosophy, setOperatingPhilosophy] = useState<OperatingPhilosophy>("review-before-deploy");
  const [canUse15Min, setCanUse15Min] = useState(false);

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => setCanUse15Min(d.canUse15Min ?? false))
      .catch(() => setCanUse15Min(false));
  }, []);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.personality && draft.personality in PERSONALITY_TEMPLATES) {
        setPersonality(draft.personality as PersonalityKey);
      }
      if (typeof draft.heartbeatMinutes === "number") {
        setHeartbeatMinutes(draft.heartbeatMinutes);
      }
      if (draft.operatingPhilosophy && PHILOSOPHIES.some((p) => p.value === draft.operatingPhilosophy)) {
        setOperatingPhilosophy(draft.operatingPhilosophy);
      }
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 3 };
    draft.step = 4;
    draft.personality = personality;
    draft.heartbeatMinutes = heartbeatMinutes;
    draft.operatingPhilosophy = operatingPhilosophy;
    setOnboardDraft(draft);
  }, [personality, heartbeatMinutes, operatingPhilosophy]);

  const template = PERSONALITY_TEMPLATES[personality];

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 4 of 5
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Personality and Philosophy
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Choose a style and how autonomous your agent should be.
        </p>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* Personality cards */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 text-center">
            Choose a style
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(PERSONALITY_TEMPLATES) as PersonalityKey[]).map((key) => {
              const t = PERSONALITY_TEMPLATES[key];
              const isSelected = personality === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPersonality(key)}
                  className={`group rounded-2xl border p-6 text-left transition ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 transition ${
                      isSelected
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 group-hover:text-zinc-300"
                    }`}
                  >
                    {PERSONALITY_ICONS[key]}
                  </div>
                  <p className="font-semibold text-white mb-1">{t.name}</p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    &ldquo;{t.tagline}&rdquo;
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Operating philosophy */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 text-center">
            How autonomous should your agent be?
          </p>
          <div className="space-y-3">
            {PHILOSOPHIES.map((p) => {
              const isSelected = operatingPhilosophy === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setOperatingPhilosophy(p.value)}
                  className={`group block w-full rounded-2xl border p-5 text-left transition ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 group-hover:text-zinc-300"
                      }`}
                    >
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white mb-1">{p.label}</p>
                      <p className="text-sm text-zinc-500 mb-1">&ldquo;{p.desc}&rdquo;</p>
                      <p className="text-sm text-zinc-400 leading-relaxed">{p.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Heartbeat config */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <Clock className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">Heartbeat</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-3 ml-[42px]">
            How often your agent checks for updates.
          </p>
          <p className="text-xs text-amber-400/90 mb-5 ml-[42px]">
            Free: hourly check-ins. Pro: every 15 minutes.
          </p>

          <div className="flex flex-wrap gap-3">
            {HEARTBEAT_OPTIONS.map((m) => {
              const is15ProOnly = m === 15 && !canUse15Min;
              const isSelected = heartbeatMinutes === m;
              return (
                <div key={m} className="relative">
                  <button
                    type="button"
                    onClick={() => !is15ProOnly && setHeartbeatMinutes(m)}
                    disabled={is15ProOnly}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                      is15ProOnly
                        ? "border border-zinc-700 bg-zinc-800/30 text-zinc-500 cursor-not-allowed"
                        : isSelected
                          ? "border border-amber-500/40 bg-amber-500/15 text-amber-400"
                          : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    {m} min
                  </button>
                  {is15ProOnly && (
                    <span className="absolute -bottom-5 left-0 text-[10px] text-amber-400/90 whitespace-nowrap">
                      Upgrade to Pro
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg bg-zinc-800/50 border border-zinc-800 px-4 py-3">
            <p className="text-sm text-zinc-400">
              This agent will check GitHub, RSS, and Moltbook every{" "}
              <span className="text-amber-400 font-medium">{heartbeatMinutes} min</span>.
            </p>
          </div>
        </div>

        {/* Tier info */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-500 leading-relaxed">
              <span className="text-zinc-400 font-medium">Autonomy tiers:</span>{" "}
              Tier 1 (file org, research), Tier 2 (code, docs), Tier 3 (public posts, financial).
              You can adjust these later in Settings.
            </p>
          </div>
        </div>

        {/* Advanced */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            Advanced
          </h3>
          <PowerCoreImportCard />
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/3"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <Link
          href="/onboard/5"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
