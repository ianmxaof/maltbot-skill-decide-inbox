/**
 * GET /api/cron/risk-report — Daily (or custom) risk summary for cron or dashboard.
 * Query: ?hours=24 (default) or ?hours=168 for 7d.
 * If anomalies in last hour >= 5 and RISK_REPORT_WEBHOOK_URL is set, POSTs alert to webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildRiskReport, maybeSendEventTriggeredAlert } from "@/lib/security/risk-report";
import { getAnomalyDetector } from "@/lib/security/anomaly-detector";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? Math.min(168, Math.max(1, parseInt(hoursParam, 10) || 24)) : 24;

    const summary = await buildRiskReport(hours);

    // Event-triggered: if anomalies in last hour >= 5, optionally POST to webhook
    const detector = getAnomalyDetector();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const anomaliesLastHour = detector.getEvents(oneHourAgo).length;
    await maybeSendEventTriggeredAlert(anomaliesLastHour, 5);

    return NextResponse.json({
      success: true,
      summary,
      anomaliesLastHour,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Risk report failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
