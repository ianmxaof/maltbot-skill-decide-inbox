/**
 * Awareness check (neshama check): "should this happen at all" / "does this need human input".
 * Stub returns allowed: true. Phase 2+ can plug in Layer 2/3 signals to set requiresHuman.
 */

import type { AwarenessResult } from "@/types/governance";

export interface AwarenessContext {
  operation?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/** Stub: always allow. Replace with real check that uses signals to set requiresHuman. */
export async function checkAwareness(_context?: AwarenessContext): Promise<AwarenessResult> {
  return {
    allowed: true,
    reason: "Stub: no awareness override",
  };
}
