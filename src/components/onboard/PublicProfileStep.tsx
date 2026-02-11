"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const VISIBILITIES: { value: Visibility; label: string; desc: string }[] = [
  { value: "public", label: "Public Profile", desc: "Others can discover you, see your setup, and find similar operators" },
  { value: "unlisted", label: "Unlisted", desc: "Direct link works, but not in discovery" },
  { value: "private", label: "Private", desc: "Only you can see it (can change later)" },
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
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-white">
          Step 4 of 4: Share Your Journey?
        </h2>
        <p className="mt-1 text-zinc-400">
          Your profile is ready! Want to share it?
        </p>
      </section>

      <section>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Your name
        </label>
        <input
          type="text"
          value={humanName}
          onChange={(e) => setHumanName(e.target.value)}
          placeholder="e.g. Ian"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
        <label className="block text-sm font-medium text-zinc-300 mb-2 mt-4">
          Agent name
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="e.g. Claude"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
      </section>

      <section className="space-y-3">
        {VISIBILITIES.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setVisibility(v.value)}
            className={`block w-full rounded-lg border p-4 text-left transition ${
              visibility === v.value
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
            }`}
          >
            <p className="font-medium text-white">{v.label}</p>
            <p className="text-sm text-zinc-500 mt-1">{v.desc}</p>
          </button>
        ))}
      </section>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Profile Preview</h3>
        <p className="text-white">{humanName || "You"} (@{humanName || "Operator"})</p>
        <p className="text-sm text-zinc-500 mt-1">Agent: {agentName}</p>
        <p className="text-sm text-zinc-500">
          Philosophy: {(operatingPhilosophy ?? "review-before-deploy").replace(/-/g, " ")}
        </p>
        <p className="text-sm text-zinc-500">
          Monitoring: {repoCount} repos, {feedCount} feeds
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex justify-between pt-4">
        <Link href="/onboard/3" className="text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading || !humanName.trim()}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Enter Dashboard"}
        </button>
      </div>
    </div>
  );
}
