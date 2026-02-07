/**
 * Feed auto-refresh interval (localStorage). Used by useAgentActivity, useMoltbookData, useDecideInboxData.
 * Dispatch "maltbot:refreshIntervalChanged" when value changes so hooks can re-subscribe.
 */

const STORAGE_KEY = "maltbot.feedRefreshIntervalSec";
export const REFRESH_INTERVAL_CHANGED = "maltbot:refreshIntervalChanged";

export const REFRESH_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 120, label: "2 minutes" },
] as const;

const DEFAULT_SEC = 30;

export function getRefreshIntervalSec(): number {
  if (typeof window === "undefined") return DEFAULT_SEC;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_SEC;
    const n = parseInt(raw, 10);
    return REFRESH_OPTIONS.some((o) => o.value === n) ? n : DEFAULT_SEC;
  } catch {
    return DEFAULT_SEC;
  }
}

export function setRefreshIntervalSec(sec: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(sec));
    window.dispatchEvent(new CustomEvent(REFRESH_INTERVAL_CHANGED, { detail: sec }));
  } catch {
    // ignore
  }
}

/** Interval in ms for setInterval; 0 means no auto-refresh */
export function getRefreshIntervalMs(): number {
  const sec = getRefreshIntervalSec();
  return sec === 0 ? 0 : sec * 1000;
}
