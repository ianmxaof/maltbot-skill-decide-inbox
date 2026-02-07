/**
 * GET /api/governance/fingerprint — Governance fingerprint for current operator.
 * Query: ?hours=720 (default 30 days).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFingerprint } from "@/lib/governance-fingerprint";
import { getOperatorId } from "@/lib/operator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? Math.min(8760, Math.max(1, parseInt(hoursParam, 10) || 720)) : 720;

    const operatorId = getOperatorId();
    const fingerprint = await getFingerprint(operatorId, hours);
    return NextResponse.json({ success: true, fingerprint });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to compute fingerprint";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
