"use client";

import { useState, useEffect, useCallback } from "react";
import type { SpaceLayout, BackgroundStyle } from "@/types/social";

interface SpaceThemeEditorProps {
  pairId: string;
}

const ACCENT_PRESETS = [
  "#8b5cf6", "#6366f1", "#ec4899", "#06b6d4",
  "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
];

const LAYOUTS: { value: SpaceLayout; label: string; desc: string }[] = [
  { value: "default", label: "Default", desc: "Two-column balanced" },
  { value: "minimal", label: "Minimal", desc: "Clean and sparse" },
  { value: "dense", label: "Dense", desc: "Information-packed" },
  { value: "editorial", label: "Editorial", desc: "Story-like flow" },
];

const BACKGROUNDS: { value: BackgroundStyle; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "gradient", label: "Gradient" },
  { value: "light", label: "Light" },
];

export function SpaceThemeEditor({ pairId }: SpaceThemeEditorProps) {
  const [theme, setTheme] = useState({
    accentColor: "#6366f1",
    backgroundStyle: "dark" as BackgroundStyle,
    gradientFrom: "#0f0a1e",
    gradientTo: "#1a0b2e",
    layout: "default" as SpaceLayout,
    tagline: "",
    bioMarkdown: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pairId) return;
    fetch(`/api/social/theme?pairId=${encodeURIComponent(pairId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.theme) {
          setTheme(prev => ({
            ...prev,
            accentColor: data.theme.accentColor ?? prev.accentColor,
            backgroundStyle: data.theme.backgroundStyle ?? prev.backgroundStyle,
            gradientFrom: data.theme.gradientFrom ?? prev.gradientFrom,
            gradientTo: data.theme.gradientTo ?? prev.gradientTo,
            layout: data.theme.layout ?? prev.layout,
            tagline: data.theme.tagline ?? prev.tagline,
            bioMarkdown: data.theme.bioMarkdown ?? prev.bioMarkdown,
          }));
        }
      })
      .catch((e) => console.error("[SpaceThemeEditor] fetch failed:", e))
      .finally(() => setLoading(false));
  }, [pairId]);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch("/api/social/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, ...updates }),
      });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [pairId]);

  const updateField = useCallback((key: string, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
    save({ [key]: value });
  }, [save]);

  if (loading) {
    return <div className="text-sm text-zinc-500 py-4">Loading theme...</div>;
  }

  return (
    <div className="space-y-6">
      {saving && <span className="text-xs text-amber-400">Saving...</span>}

      {/* Accent Color */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Accent Color
        </label>
        <div className="flex gap-2 mt-2">
          {ACCENT_PRESETS.map(color => (
            <button
              key={color}
              onClick={() => updateField("accentColor", color)}
              className={`w-8 h-8 rounded-lg transition-all ${
                theme.accentColor === color
                  ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={theme.accentColor}
            onChange={e => updateField("accentColor", e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700"
          />
        </div>
      </div>

      {/* Background Style */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Background
        </label>
        <div className="flex gap-2 mt-2">
          {BACKGROUNDS.map(bg => (
            <button
              key={bg.value}
              onClick={() => updateField("backgroundStyle", bg.value)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition border ${
                theme.backgroundStyle === bg.value
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {bg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Layout
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {LAYOUTS.map(l => (
            <button
              key={l.value}
              onClick={() => updateField("layout", l.value)}
              className={`p-3 rounded-lg text-left transition border ${
                theme.layout === l.value
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className={`text-sm font-medium ${theme.layout === l.value ? "text-violet-300" : "text-zinc-300"}`}>
                {l.label}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Tagline
        </label>
        <input
          type="text"
          value={theme.tagline}
          onChange={e => setTheme(prev => ({ ...prev, tagline: e.target.value }))}
          onBlur={() => save({ tagline: theme.tagline })}
          placeholder="I stopped reading Reddit, Twitter, and GitHub. My agent tells me when it matters."
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Bio (Markdown)
        </label>
        <textarea
          value={theme.bioMarkdown}
          onChange={e => setTheme(prev => ({ ...prev, bioMarkdown: e.target.value }))}
          onBlur={() => save({ bioMarkdown: theme.bioMarkdown })}
          placeholder="Tell your story..."
          rows={4}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-y"
        />
      </div>

      {/* Preview Banner */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
          Preview
        </label>
        <div
          className="rounded-xl p-6 border border-zinc-800/50"
          style={{
            background: theme.backgroundStyle === "gradient"
              ? `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`
              : theme.backgroundStyle === "light"
                ? "#f8fafc"
                : "#0f172a",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}88)` }}
            >
              ?
            </div>
            <div>
              <div className={`font-semibold ${theme.backgroundStyle === "light" ? "text-zinc-900" : "text-white"}`}>
                Your Space
              </div>
              <div className={`text-xs ${theme.backgroundStyle === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                {theme.tagline || "Your tagline here..."}
              </div>
            </div>
          </div>
          {theme.bioMarkdown && (
            <p className={`text-sm ${theme.backgroundStyle === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
              {theme.bioMarkdown.slice(0, 120)}{theme.bioMarkdown.length > 120 ? "..." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
