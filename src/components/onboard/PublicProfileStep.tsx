"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Link2,
  Lock,
  User,
  ChevronLeft,
  Rocket,
  Loader2,
} from "lucide-react";
import {
  getOnboardDraft,
  setOnboardDraft,
  clearOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";
import {
  PERSONALITY_TEMPLATES,
  type PersonalityKey,
} from "@/data/personality-templates";
import type { Visibility } from "@/types/agent-pair";
import { showToast } from "@/lib/toast";

const VISIBILITIES: {
  value: Visibility;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "public",
    label: "Public Profile",
    desc: "Others can discover you, see your setup, and find similar operators",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    desc: "Direct link works, but not in discovery",
    icon: <Link2 className="w-5 h-5" />,
  },
  {
    value: "private",
    label: "Private",
    desc: "Only you can see it (can change later)",
    icon: <Lock className="w-5 h-5" />,
  },
];

export function PublicProfileStep() {
  const router = useRouter();
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [humanName, setHumanName] = useState("");
  const [agentName, setAgentName] = useState("Agent");
  const [operatingPhilosophy, setOperatingPhilosophy] = useState("review-before-deploy");
  const [contextSources, setContextSources] = useState<OnboardDraft["contextSources"]>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.visibility) setVisibility(draft.visibility);
      if (draft.humanName) setHumanName(draft.humanName);
      if (draft.agentName) setAgentName(draft.agentName);
      if (draft.operatingPhilosophy) setOperatingPhilosophy(draft.operatingPhilosophy);
      if (draft.contextSources) setContextSources(draft.contextSources);
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 4 };
    draft.step = 4;
    draft.visibility = visibility;
    draft.humanName = humanName;
    draft.agentName = agentName;
    setOnboardDraft(draft);
  }, [visibility, humanName, agentName]);

  const handleComplete = async () => {
    const draft = getOnboardDraft();
    if (!draft) return;

    const personality = (draft.personality ?? "proactive-builder") as PersonalityKey;
    const template = PERSONALITY_TEMPLATES[personality];
    const soulMd = template?.soulMd(draft.humanName ?? "You") ?? undefined;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          humanName: draft.humanName ?? "Operator",
          agentName: draft.agentName ?? "Agent",
          operatingPhilosophy: draft.operatingPhilosophy ?? "review-before-deploy",
          visibility: draft.visibility ?? "private",
          contextSources: draft.contextSources ?? {
            githubRepos: [],
            githubUsers: [],
            rssUrls: [],
            moltbookTopics: [],
          },
          soulMd,
          activityPattern: {
            heartbeatIntervalMinutes: draft.heartbeatMinutes ?? 30,
            proactiveVsReactive: 0.5,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error ?? "Failed to create pair");
      }
      clearOnboardDraft();
      showToast("Profile saved");
      // Fire first-scan in background — don't await
      if (data.pair?.id) {
        fetch("/api/workers/first-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairId: data.pair.id }),
        }).catch((e) => console.error("[PublicProfileStep] first-scan failed:", e));
      }
      router.push("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create pair");
    } finally {
      setLoading(false);
    }
  };

  const repoCount =
    (contextSources?.githubRepos?.length ?? 0) +
    (contextSources?.githubUsers?.length ?? 0);
  const feedCount = contextSources?.rssUrls?.length ?? 0;

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 4 of 4
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Share Your Journey?
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Your profile is ready! Name your pair and choose how visible you want to be.
        </p>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* Name inputs */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">Your Pair</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Your name
              </label>
              <input
                type="text"
                value={humanName}
                onChange={(e) => setHumanName(e.target.value)}
                placeholder="e.g. Ian"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Agent name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Claude"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 text-center">
            Profile visibility
          </p>
          <div className="space-y-3">
            {VISIBILITIES.map((v) => {
              const isSelected = visibility === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVisibility(v.value)}
                  className={`group block w-full rounded-2xl border p-5 sm:p-6 text-left transition ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 group-hover:text-zinc-300"
                      }`}
                    >
                      {v.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{v.label}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">{v.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile preview */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
            Profile Preview
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="text-lg font-bold text-amber-400">
                {(humanName || "O").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white text-lg">
                {humanName || "You"}{" "}
                <span className="text-zinc-600 font-normal">&times;</span>{" "}
                {agentName || "Agent"}
              </p>
              <p className="text-sm text-zinc-500">
                @{(humanName || "Operator").toLowerCase().replace(/\s+/g, "")}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-zinc-400">
              <span className="text-zinc-500">Philosophy:</span>{" "}
              {(operatingPhilosophy ?? "review-before-deploy").replace(/-/g, " ")}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-500">Monitoring:</span>{" "}
              {repoCount} repo{repoCount !== 1 ? "s" : ""}, {feedCount} feed{feedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/3"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading || !humanName.trim()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:hover:bg-amber-500 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Enter Dashboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}
