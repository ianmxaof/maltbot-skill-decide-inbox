"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Music, Plus, X, GripVertical, ChevronUp, ChevronDown,
  PieChart, Gauge, Activity, Rss, Github, Rocket, Radar, BookMarked, FileText, Flame,
} from "lucide-react";
import type { SpaceLayout, BackgroundStyle, ThemePackId, ProfileWidget, WidgetSize } from "@/types/social";
import { THEME_PACK_LIST, getThemePack } from "@/data/theme-packs";
import { WIDGET_LIST, getDefaultWidgets } from "@/data/widget-definitions";

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
    themePack: "default" as ThemePackId,
    profileSoundtrackUrl: "",
    tagline: "",
    bioMarkdown: "",
    bulletin: "",
  });
  const [widgets, setWidgets] = useState<ProfileWidget[]>(getDefaultWidgets());
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
            themePack: data.theme.themePack ?? prev.themePack,
            profileSoundtrackUrl: data.theme.profileSoundtrackUrl ?? prev.profileSoundtrackUrl,
            tagline: data.theme.tagline ?? prev.tagline,
            bioMarkdown: data.theme.bioMarkdown ?? prev.bioMarkdown,
            bulletin: data.theme.bulletin ?? prev.bulletin ?? "",
          }));
          if (data.theme.widgets) {
            setWidgets(data.theme.widgets);
          }
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

  const applyThemePack = useCallback((packId: ThemePackId) => {
    const pack = getThemePack(packId);
    const updates = {
      themePack: packId,
      accentColor: pack.accentColor,
      backgroundStyle: pack.backgroundStyle,
      gradientFrom: pack.gradientFrom,
      gradientTo: pack.gradientTo,
    };
    setTheme(prev => ({ ...prev, ...updates }));
    save(updates);
  }, [save]);

  if (loading) {
    return <div className="text-sm text-zinc-500 py-4">Loading theme...</div>;
  }

  return (
    <div className="space-y-6">
      {saving && <span className="text-xs text-amber-400">Saving...</span>}

      {/* Theme Pack Gallery */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Theme Pack
        </label>
        <p className="text-[11px] text-zinc-500 mt-0.5 mb-2">
          Select a visual skin — colors, fonts, and card styles all in one click.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PACK_LIST.map(pack => (
            <button
              key={pack.id}
              onClick={() => applyThemePack(pack.id)}
              className={`group relative rounded-xl border p-3 text-left transition-all overflow-hidden ${
                theme.themePack === pack.id
                  ? "border-violet-500 ring-1 ring-violet-500/30 bg-violet-500/5"
                  : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/30"
              }`}
            >
              {/* Preview swatch */}
              <div
                className="h-8 rounded-lg mb-2 border border-zinc-700/50"
                style={{ background: pack.preview }}
              />
              <div className={`text-xs font-semibold ${
                theme.themePack === pack.id ? "text-violet-300" : "text-zinc-300"
              }`}>
                {pack.name}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                {pack.description}
              </div>
              {/* Accent dot */}
              <div
                className="absolute top-2 right-2 w-3 h-3 rounded-full border border-zinc-700/30"
                style={{ backgroundColor: pack.accentColor }}
              />
            </button>
          ))}
        </div>
      </div>

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

      {/* Bulletin (MySpace-style) */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Bulletin
        </label>
        <p className="text-[11px] text-zinc-500 mt-0.5 mb-1">
          A short message on your Space. &ldquo;What&apos;s up&rdquo; for your network.
        </p>
        <textarea
          value={theme.bulletin}
          onChange={e => setTheme(prev => ({ ...prev, bulletin: e.target.value }))}
          onBlur={() => save({ bulletin: theme.bulletin, bulletinUpdatedAt: new Date().toISOString() })}
          placeholder="Post a bulletin for your followers..."
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-y"
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

      {/* Profile Soundtrack */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5" />
          Profile Soundtrack
        </label>
        <p className="text-[11px] text-zinc-500 mt-0.5 mb-1">
          Paste a Spotify, YouTube, or SoundCloud embed URL. Visitors can play it on your Space.
        </p>
        <input
          type="url"
          value={theme.profileSoundtrackUrl}
          onChange={e => setTheme(prev => ({ ...prev, profileSoundtrackUrl: e.target.value }))}
          onBlur={() => save({ profileSoundtrackUrl: theme.profileSoundtrackUrl })}
          placeholder="https://open.spotify.com/track/..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Widget Manager */}
      <WidgetManager
        widgets={widgets}
        onChange={(updated) => {
          setWidgets(updated);
          save({ widgets: updated });
        }}
      />

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

// ─── Widget Manager Sub-Component ─────────────────────────

const WIDGET_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PieChart, Gauge, Activity, Rss, Github, Rocket, Radar, BookMarked, FileText, Flame, Music,
};

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: "1x1", label: "Small" },
  { value: "2x1", label: "Wide" },
  { value: "1x2", label: "Tall" },
  { value: "2x2", label: "Large" },
];

function WidgetManager({
  widgets,
  onChange,
}: {
  widgets: ProfileWidget[];
  onChange: (widgets: ProfileWidget[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const activeTypes = new Set(widgets.map(w => w.type));

  const moveWidget = (index: number, direction: -1 | 1) => {
    const next = [...widgets];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    // Update positions
    next.forEach((w, i) => { w.position = i; });
    onChange(next);
  };

  const toggleWidget = (index: number) => {
    const next = [...widgets];
    next[index] = { ...next[index], visible: !next[index].visible };
    onChange(next);
  };

  const removeWidget = (index: number) => {
    const next = widgets.filter((_, i) => i !== index);
    next.forEach((w, i) => { w.position = i; });
    onChange(next);
  };

  const changeSize = (index: number, size: WidgetSize) => {
    const next = [...widgets];
    next[index] = { ...next[index], size };
    onChange(next);
  };

  const addWidget = (type: string) => {
    const def = WIDGET_LIST.find(w => w.type === type);
    if (!def) return;

    const newWidget: ProfileWidget = {
      id: `w_${type}_${Date.now()}`,
      type: def.type,
      size: def.defaultSize,
      position: widgets.length,
      visible: true,
    };
    onChange([...widgets, newWidget]);
    setShowPicker(false);
  };

  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Profile Widgets
      </label>
      <p className="text-[11px] text-zinc-500 mt-0.5 mb-3">
        Add, remove, and reorder dashboard widgets on your Space.
      </p>

      {/* Active widgets list */}
      <div className="space-y-2 mb-3">
        {widgets.map((widget, i) => {
          const def = WIDGET_LIST.find(d => d.type === widget.type);
          const Icon = def ? WIDGET_ICON_MAP[def.icon] ?? Radar : Radar;

          return (
            <div
              key={widget.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                widget.visible
                  ? "border-zinc-700 bg-zinc-900/50"
                  : "border-zinc-800 bg-zinc-900/20 opacity-50"
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
              <Icon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="text-xs font-medium text-zinc-300 flex-1 truncate">
                {widget.title ?? def?.name ?? widget.type}
              </span>

              {/* Size selector */}
              <select
                value={widget.size}
                onChange={(e) => changeSize(i, e.target.value as WidgetSize)}
                className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400 focus:outline-none"
              >
                {(def?.availableSizes ?? SIZE_OPTIONS.map(s => s.value)).map(s => (
                  <option key={s} value={s}>
                    {SIZE_OPTIONS.find(o => o.value === s)?.label ?? s}
                  </option>
                ))}
              </select>

              {/* Move up/down */}
              <button
                onClick={() => moveWidget(i, -1)}
                disabled={i === 0}
                className="p-0.5 text-zinc-600 hover:text-zinc-400 disabled:opacity-30 transition"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveWidget(i, 1)}
                disabled={i === widgets.length - 1}
                className="p-0.5 text-zinc-600 hover:text-zinc-400 disabled:opacity-30 transition"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Toggle visibility / remove */}
              <button
                onClick={() => toggleWidget(i)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                  widget.visible
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                {widget.visible ? "On" : "Off"}
              </button>
              <button
                onClick={() => removeWidget(i)}
                className="p-0.5 text-zinc-600 hover:text-red-400 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add widget button / picker */}
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Widget
        </button>
      ) : (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Available Widgets
            </span>
            <button
              onClick={() => setShowPicker(false)}
              className="text-zinc-600 hover:text-zinc-400 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {WIDGET_LIST.map(def => {
              const Icon = WIDGET_ICON_MAP[def.icon] ?? Radar;
              const alreadyAdded = activeTypes.has(def.type);

              return (
                <button
                  key={def.type}
                  onClick={() => !alreadyAdded && addWidget(def.type)}
                  disabled={alreadyAdded}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition ${
                    alreadyAdded
                      ? "opacity-30 cursor-not-allowed bg-zinc-800/30"
                      : "hover:bg-zinc-800 cursor-pointer"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] font-medium text-zinc-300">{def.name}</div>
                    <div className="text-[9px] text-zinc-600">{def.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
