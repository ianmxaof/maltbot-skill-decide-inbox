/**
 * Onboarding session — localStorage draft during onboarding.
 * Persist selections across steps until pair is created on completion.
 */

import type { OperatingPhilosophy, Visibility } from "@/types/agent-pair";

const STORAGE_KEY = "nightly-build-onboard-draft";

export interface OnboardDraft {
  step: number;
  contextSources?: {
    githubRepos: string[];
    githubUsers: string[];
    rssUrls: string[];
    moltbookTopics: string[];
  };
  personality?: string;
  heartbeatMinutes?: number;
  humanName?: string;
  agentName?: string;
  operatingPhilosophy?: OperatingPhilosophy;
  visibility?: Visibility;
  soulMd?: string;
}

export function getOnboardDraft(): OnboardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardDraft;
  } catch {
    return null;
  }
}

export function setOnboardDraft(draft: OnboardDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearOnboardDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
