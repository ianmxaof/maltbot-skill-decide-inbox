"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import {
  getOnboardDraft,
  setOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";
import { PERSONALITY_TEMPLATES, type PersonalityKey } from "@/data/personality-templates";
import { PowerCoreImportCard } from "./PowerCoreImportCard";

const HEARTBEAT_OPTIONS = [15, 30, 60];

export function AgentConfigStep() {
  const [personality, setPersonality] = useState<PersonalityKey>("proactive-builder");
  const [heartbeatMinutes, setHeartbeatMinutes] = useState(30);
  const [humanName, setHumanName] = useState("");

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.personality && draft.personality in PERSONALITY_TEMPLATES) {
        setPersonality(draft.personality as PersonalityKey);
      }
      if (typeof draft.heartbeatMinutes === "number") {
        setHeartbeatMinutes(draft.heartbeatMinutes);
      }
      if (draft.humanName) setHumanName(draft.humanName);
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
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-white">
          Step 2 of 4: Meet Your Agent
        </h2>
        <p className="mt-1 text-zinc-400">
          Choose a personality. Your agent will check for updates on a schedule.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Quick Start</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(PERSONALITY_TEMPLATES) as PersonalityKey[]).map((key) => {
            const t = PERSONALITY_TEMPLATES[key];
            const isSelected = personality === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPersonality(key)}
                className={`rounded-lg border p-5 text-left transition ${
                  isSelected
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                }`}
              >
                <Bot className="w-8 h-8 text-amber-400 mb-2" />
                <p className="font-medium text-white">{t.name}</p>
                <p className="text-sm text-zinc-500 mt-1">&quot;{t.tagline}&quot;</p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Heartbeat</h3>
        <p className="text-sm text-zinc-500 mb-2">
          Your agent checks for updates every:
        </p>
        <select
          value={heartbeatMinutes}
          onChange={(e) => setHeartbeatMinutes(Number(e.target.value))}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white"
        >
          {HEARTBEAT_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </section>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-300">
          This agent will check GitHub, RSS, and Moltbook every {heartbeatMinutes} min.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Advanced</h3>
        <PowerCoreImportCard />
      </section>

      <div className="flex justify-between pt-4">
        <Link href="/onboard/1" className="text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <Link
          href="/onboard/3"
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
        >
          Continue →
        </Link>
      </div>
    </div>
  );
}
