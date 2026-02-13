"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rocket, Shield, Search, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import {
  getOnboardDraft,
  setOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";
import { PERSONALITY_TEMPLATES, type PersonalityKey } from "@/data/personality-templates";
import { PowerCoreImportCard } from "./PowerCoreImportCard";

const HEARTBEAT_OPTIONS = [15, 30, 60];

const PERSONALITY_ICONS: Record<PersonalityKey, React.ReactNode> = {
  "proactive-builder": <Rocket className="w-5 h-5" />,
  "careful-advisor": <Shield className="w-5 h-5" />,
  "research-assistant": <Search className="w-5 h-5" />,
};

export function AgentConfigStep() {
  const [personality, setPersonality] = useState<PersonalityKey>("proactive-builder");
  const [heartbeatMinutes, setHeartbeatMinutes] = useState(30);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.personality && draft.personality in PERSONALITY_TEMPLATES) {
        setPersonality(draft.personality as PersonalityKey);
      }
      if (typeof draft.heartbeatMinutes === "number") {
        setHeartbeatMinutes(draft.heartbeatMinutes);
      }
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 2 };
    draft.step = 2;
    draft.personality = personality;
    draft.heartbeatMinutes = heartbeatMinutes;
    setOnboardDraft(draft);
  }, [personality, heartbeatMinutes]);

  const template = PERSONALITY_TEMPLATES[personality];

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 2 of 4
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Meet Your Agent
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Choose a personality. Your agent will check for updates on a schedule.
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

        {/* Heartbeat config */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <Clock className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">Heartbeat</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-5 ml-[42px]">
            How often your agent checks for updates.
          </p>

          <div className="flex gap-3">
            {HEARTBEAT_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setHeartbeatMinutes(m)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  heartbeatMinutes === m
                    ? "border border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-zinc-800/50 border border-zinc-800 px-4 py-3">
            <p className="text-sm text-zinc-400">
              This agent will check GitHub, RSS, and Moltbook every{" "}
              <span className="text-amber-400 font-medium">{heartbeatMinutes} min</span>.
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
          href="/onboard/1"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <Link
          href="/onboard/3"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
