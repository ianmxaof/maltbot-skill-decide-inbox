"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOnboardDraft, setOnboardDraft, type OnboardDraft } from "@/lib/onboard-session";
import type { OperatingPhilosophy } from "@/types/agent-pair";

const PHILOSOPHIES: { value: OperatingPhilosophy; label: string; desc: string }[] = [
  { value: "ship-while-sleep", label: "Ship While I Sleep", desc: "Agent builds proactively, I review in AM" },
  { value: "review-before-deploy", label: "Collaborative Decision-Making", desc: "Agent proposes, I approve before action" },
  { value: "research-only", label: "Research & Report Only", desc: "Agent gathers intel, doesn't execute" },
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
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-white">
          Step 3 of 4: Define Your Working Agreement
        </h2>
        <p className="mt-1 text-zinc-400">
          How autonomous should your agent be?
        </p>
      </section>

      <section className="space-y-3">
        {PHILOSOPHIES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setOperatingPhilosophy(p.value)}
            className={`block w-full rounded-lg border p-4 text-left transition ${
              operatingPhilosophy === p.value
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
            }`}
          >
            <p className="font-medium text-white">{p.label}</p>
            <p className="text-sm text-zinc-500 mt-1">&quot;{p.desc}&quot;</p>
          </button>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-4">
        <p className="text-sm text-zinc-500">
          Autonomy tiers: Tier 1 (file org, research), Tier 2 (code, docs), Tier 3 (public posts, financial).
          You can adjust these later in Settings.
        </p>
      </section>

      <div className="flex justify-between pt-4">
        <Link href="/onboard/2" className="text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <Link
          href="/onboard/4"
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
        >
          Continue →
        </Link>
      </div>
    </div>
  );
}
