/**
 * Theme Packs — Preset visual skins for profile Spaces
 *
 * Each pack defines a coordinated set of colors, fonts, and card styles.
 * Users select a pack and can override individual values.
 */

import type { ThemePack, ThemePackId } from "@/types/social";

export const THEME_PACKS: Record<ThemePackId, ThemePack> = {
  default: {
    id: "default",
    name: "Default",
    description: "Clean and modern. The Nightly Build standard.",
    preview: "linear-gradient(135deg, #0f172a, #1e293b)",
    accentColor: "#6366f1",
    backgroundStyle: "dark",
    gradientFrom: "#0f172a",
    gradientTo: "#1e293b",
    fontMood: "sans",
    cardStyle: "outlined",
    glowEnabled: false,
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    description: "Green on black. For those who live in the CLI.",
    preview: "linear-gradient(135deg, #000000, #0a1a0a)",
    accentColor: "#22c55e",
    backgroundStyle: "dark",
    gradientFrom: "#000000",
    gradientTo: "#0a1a0a",
    fontMood: "mono",
    cardStyle: "outlined",
    glowEnabled: true,
  },
  vaporwave: {
    id: "vaporwave",
    name: "Vaporwave",
    description: "Aesthetic nostalgia. Pink and purple haze.",
    preview: "linear-gradient(135deg, #1a0533, #330066, #ff6ec7)",
    accentColor: "#ff6ec7",
    backgroundStyle: "gradient",
    gradientFrom: "#1a0533",
    gradientTo: "#0a0020",
    fontMood: "sans",
    cardStyle: "glass",
    glowEnabled: true,
  },
  glassmorphism: {
    id: "glassmorphism",
    name: "Glass",
    description: "Frosted translucent panels. Elegant depth.",
    preview: "linear-gradient(135deg, #1e1b4b, #312e81)",
    accentColor: "#818cf8",
    backgroundStyle: "gradient",
    gradientFrom: "#1e1b4b",
    gradientTo: "#312e81",
    fontMood: "sans",
    cardStyle: "glass",
    glowEnabled: false,
  },
  brutalist: {
    id: "brutalist",
    name: "Brutalist",
    description: "Raw concrete. No decoration, pure function.",
    preview: "linear-gradient(135deg, #171717, #262626)",
    accentColor: "#fafafa",
    backgroundStyle: "dark",
    gradientFrom: "#171717",
    gradientTo: "#171717",
    fontMood: "mono",
    cardStyle: "solid",
    glowEnabled: false,
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Deep blue darkness. Calm and focused.",
    preview: "linear-gradient(135deg, #020617, #0c1a3a)",
    accentColor: "#3b82f6",
    backgroundStyle: "gradient",
    gradientFrom: "#020617",
    gradientTo: "#0c1a3a",
    fontMood: "sans",
    cardStyle: "outlined",
    glowEnabled: true,
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Warm amber to deep orange. Golden hour vibes.",
    preview: "linear-gradient(135deg, #1c0a00, #451a03, #92400e)",
    accentColor: "#f59e0b",
    backgroundStyle: "gradient",
    gradientFrom: "#1c0a00",
    gradientTo: "#451a03",
    fontMood: "serif",
    cardStyle: "glass",
    glowEnabled: true,
  },
  arctic: {
    id: "arctic",
    name: "Arctic",
    description: "Ice cold clarity. Minimal and bright.",
    preview: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    accentColor: "#0ea5e9",
    backgroundStyle: "light",
    gradientFrom: "#f0f9ff",
    gradientTo: "#e0f2fe",
    fontMood: "sans",
    cardStyle: "glass",
    glowEnabled: false,
  },
  "neon-tokyo": {
    id: "neon-tokyo",
    name: "Neon Tokyo",
    description: "Cyberpunk city lights. Electric and alive.",
    preview: "linear-gradient(135deg, #0a0015, #1a002a, #00ffff)",
    accentColor: "#00ffff",
    backgroundStyle: "gradient",
    gradientFrom: "#0a0015",
    gradientTo: "#1a002a",
    fontMood: "mono",
    cardStyle: "glass",
    glowEnabled: true,
  },
};

export const THEME_PACK_LIST = Object.values(THEME_PACKS);

export function getThemePack(id: ThemePackId): ThemePack {
  return THEME_PACKS[id] ?? THEME_PACKS.default;
}
