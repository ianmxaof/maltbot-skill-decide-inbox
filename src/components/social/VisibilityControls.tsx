"use client";

import { useState, useEffect, useCallback } from "react";
import type { VisibilityLevel } from "@/types/social";

interface VisibilityControlsProps {
  pairId: string;
}

interface SectionDef {
  key: string;
  label: string;
  desc: string;
  levels: readonly VisibilityLevel[];
}

const SECTIONS: SectionDef[] = [
  { key: "contextSources", label: "Context Sources", desc: "Repos, feeds, and topics you monitor", levels: ["private", "network", "public"] },
  { key: "decisionPatterns", label: "Decision Patterns", desc: "Your approve/ignore/escalate activity", levels: ["private", "network", "public"] },
  { key: "agentConfig", label: "Agent Configuration", desc: "Your agent's personality and mode", levels: ["private", "network", "public"] },
  { key: "activityFeed", label: "Activity Feed", desc: "Recent actions and agent events", levels: ["private", "network", "public"] },
  { key: "governanceFingerprint", label: "Governance Fingerprint", desc: "Summary of your operating style", levels: ["private", "public"] },
  { key: "signalFeeds", label: "Signal Feeds", desc: "Which signals you subscribe to", levels: ["private", "network", "public"] },
  { key: "skills", label: "Installed Skills", desc: "Skills your agent uses", levels: ["private", "public"] },
];

const LEVEL_LABELS: Record<string, string> = {
  private: "\uD83D\uDD12 Private",
  network: "\uD83D\uDC65 Network",
  public: "\uD83C\uDF0D Public",
};

const LEVEL_ACTIVE_CLASSES: Record<string, string> = {
  private: "border-zinc-500 bg-zinc-500/10 text-zinc-400",
  network: "border-indigo-500 bg-indigo-500/10 text-indigo-400",
  public: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
};

export function VisibilityControls({ pairId }: VisibilityControlsProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pairId) return;
    fetch(`/api/social/visibility?pairId=${encodeURIComponent(pairId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          const s: Record<string, string> = {};
          SECTIONS.forEach(sec => {
            s[sec.key] = data.settings[sec.key] ?? "private";
          });
          setSettings(s);
        }
      })
      .catch((e) => console.error("[VisibilityControls] fetch failed:", e))
      .finally(() => setLoading(false));
  }, [pairId]);

  const update = useCallback(async (key: string, level: string) => {
    setSettings(prev => ({ ...prev, [key]: level }));
    setSaving(true);
    try {
      await fetch("/api/social/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, [key]: level }),
      });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [pairId]);

  if (loading) {
    return <div className="text-sm text-zinc-500 py-4">Loading visibility settings...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-zinc-400">
          Choose what visitors and followers can see on your space. Everything is private by default.
        </p>
        {saving && <span className="text-xs text-amber-400 ml-2">Saving...</span>}
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ key, label, desc, levels }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div>
              <div className="text-sm font-semibold text-zinc-200">{label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
            </div>
            <div className="flex gap-1">
              {levels.map(level => (
                <button
                  key={level}
                  onClick={() => update(key, level)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition border ${
                    settings[key] === level
                      ? LEVEL_ACTIVE_CLASSES[level]
                      : "border-transparent text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
