"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Users, FileText, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { getOnboardDraft, setOnboardDraft, type OnboardDraft } from "@/lib/onboard-session";
import type { OperatingPhilosophy } from "@/types/agent-pair";

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

export function PhilosophyStep() {
  const [operatingPhilosophy, setOperatingPhilosophy] = useState<OperatingPhilosophy>("review-before-deploy");

  useEffect(() => {
    const draft = getOnboardDraft();
    const val = draft?.operatingPhilosophy;
    if (val && PHILOSOPHIES.some((p) => p.value === val)) {
      setOperatingPhilosophy(val);
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 3 };
    draft.step = 3;
    draft.operatingPhilosophy = operatingPhilosophy;
    setOnboardDraft(draft);
  }, [operatingPhilosophy]);

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 3 of 4
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Define Your Working Agreement
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          How autonomous should your agent be? You can always adjust this later.
        </p>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="space-y-4">
        {PHILOSOPHIES.map((p) => {
          const isSelected = operatingPhilosophy === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setOperatingPhilosophy(p.value)}
              className={`group block w-full rounded-2xl border p-6 sm:p-8 text-left transition ${
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
                  <p className="text-sm text-zinc-500 mb-2">
                    &ldquo;{p.desc}&rdquo;
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {p.detail}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tier info */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-sm text-zinc-500 leading-relaxed">
            <span className="text-zinc-400 font-medium">Autonomy tiers:</span>{" "}
            Tier 1 (file org, research), Tier 2 (code, docs), Tier 3 (public posts, financial).
            You can adjust these later in Settings.
          </p>
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/2"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <Link
          href="/onboard/4"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
