/**
 * Onboarding session — localStorage draft during onboarding.
 * Persist selections across steps until pair is created on completion.
 */

import type { OperatingPhilosophy, Visibility } from "@/types/agent-pair";

const STORAGE_KEY = "nightly-build-onboard-draft";

export type AgentFramework = "openclaw" | "agent-zero" | "none";

export interface OnboardDraft {
  step: number;
  apiKeyProvider?: string;
  apiKeyMasked?: string;
  modelId?: string;
  agentFramework?: AgentFramework;
  /** Project created during Import Your Project step */
  projectId?: string;
  /** User chose to skip importing a project */
  projectSkipped?: boolean;
  /** Channel user intends to connect (discord, telegram, whatsapp) */
  channelIntent?: string;
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
