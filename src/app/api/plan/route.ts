/**
 * GET /api/plan — Return current plan tier for UI gating.
 * Used by onboarding and Settings to show upgrade prompts.
 */

import { NextResponse } from "next/server";
import { getPlanTier, getMinHeartbeatMinutes } from "@/lib/plan-utils";

export async function GET() {
  const tier = getPlanTier();
  const minHeartbeatMinutes = getMinHeartbeatMinutes();
  return NextResponse.json({
    tier,
    minHeartbeatMinutes,
    canUse15Min: tier === "pro",
  });
}
