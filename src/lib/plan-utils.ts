/**
 * Plan / tier utilities for monetization.
 * Free: hourly check-ins max. Pro: every 15 minutes.
 * Gate heartbeat frequency and show upgrade prompts.
 */

export type PlanTier = "free" | "pro";

/** Current plan (env-driven; default free until billing is wired) */
export function getPlanTier(): PlanTier {
  const tier = process.env.PLAN_TIER?.toLowerCase();
  if (tier === "pro") return "pro";
  return "free";
}

/** Minimum heartbeat interval (minutes) allowed for the current plan */
export function getMinHeartbeatMinutes(): number {
  return getPlanTier() === "pro" ? 15 : 60;
}

/** Whether 15-minute heartbeat is available */
export function canUse15MinHeartbeat(): boolean {
  return getPlanTier() === "pro";
}
