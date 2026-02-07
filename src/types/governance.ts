/**
 * Governance dashboard types: awareness, MET switch, feedback loop, provenance, edge layer.
 * See governance_dashboard_refined plan.
 */

import type { SignalFeedCard } from "./dashboard";

/** Visibility for shareable data (social layer). Default "private". */
export type Visibility = "private" | "semi_public" | "network_emergent";
export const DEFAULT_VISIBILITY: Visibility = "private";

/** Neshama check: "should this happen at all" / "does this need human input". */
export interface AwarenessResult {
  allowed: boolean;
  reason?: string;
  requiresHuman?: boolean;
  consequences?: string;
  reversibility?: string;
}

/** MET switch: human-initiated halt of all autonomous execution. */
export interface SystemState {
  mode: "active" | "supervised" | "halted";
  haltedAt?: string; // ISO
  haltedBy?: string;
  haltReason?: string;
}

/** Feedback: how a signal was used and what happened (for future weighting). */
export interface SignalOutcome {
  signalId: string;
  actionTaken: "followed" | "ignored" | "modified";
  outcome: "positive" | "negative" | "neutral" | "unknown";
  outcomeNotes?: string;
  timestamp: string; // ISO
}

/** Full audit trail from trigger to outcome. */
export interface DecisionProvenance {
  decisionId: string;
  triggeredBy: SignalFeedCard[];
  awarenessResult: AwarenessResult;
  operatorId?: string;
  visibility?: Visibility;
  humanApproval?: {
    approvedBy: string;
    timestamp: string; // ISO
    notes?: string;
  };
  executionResult?: {
    success: boolean;
    outcome: string;
  };
}

// --- Phase 3: Edge layer (Layer 2/3) ---

export interface CrossDomainSignal {
  pattern: string;
  domains: string[];
  correlation: number;
  interpretation?: string;
}

export interface SynchronicitySignal {
  concept: string;
  occurrences: { source: string; timestamp: string; context: string }[];
  unusualnessScore: number;
}

export interface NegativeSpaceSignal {
  topic: string;
  expectedMentions: number;
  actualMentions: number;
  gap: number;
  hypothesis?: string;
}
