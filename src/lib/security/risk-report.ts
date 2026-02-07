/**
 * Risk report: aggregate activity log, anomalies, and suggested rules for a time window.
 * Used by GET /api/cron/risk-report (daily summary) and optional event-triggered webhook.
 */

import { getActivityStore } from "@/lib/persistence";
import { getAnomalyDetector } from "./anomaly-detector";
import { getSuggestedGuardrails } from "./guardrail-suggestions";

export interface RiskReportSummary {
  period: string; // e.g. "24h" or "7d"
  since: string; // ISO
  until: string; // ISO
  blockedCount: number;
  approvedCount: number;
  anomalyCount: number;
  rateSpikeCount: number;
  topAnomalyTypes: Record<string, number>;
  suggestedRulesCount: number;
  suggestedRules: { id: string; description: string; type: string }[];
}

export async function buildRiskReport(hoursBack: number = 24): Promise<RiskReportSummary> {
  const until = new Date();
  const since = new Date(until.getTime() - hoursBack * 60 * 60 * 1000);
  const store = getActivityStore();
  const entries = await store.query({ since, until, limit: 10000 });

  let blockedCount = 0;
  let approvedCount = 0;
  let rateSpikeCount = 0;
  const anomalyByType: Record<string, number> = {};

  for (const e of entries) {
    if (e.type === "operation_blocked") blockedCount++;
    else if (e.type === "operation_approved") approvedCount++;
    else if (e.type === "rate_spike") rateSpikeCount++;
    else if (e.type === "anomaly_detected") {
      const t = e.anomalyType ?? "unknown";
      anomalyByType[t] = (anomalyByType[t] ?? 0) + 1;
    }
  }

  const detector = getAnomalyDetector();
  const anomalyEvents = detector.getEvents(since);
  const anomalyCount = anomalyEvents.length;

  for (const ev of anomalyEvents) {
    const t = ev.type ?? "unknown";
    anomalyByType[t] = (anomalyByType[t] ?? 0) + 1;
  }

  const suggestions = await getSuggestedGuardrails(hoursBack);
  const suggestedRules = suggestions.map((s) => ({
    id: s.id,
    description: s.description,
    type: s.type,
  }));

  const period = hoursBack === 24 ? "24h" : hoursBack === 168 ? "7d" : `${hoursBack}h`;

  return {
    period,
    since: since.toISOString(),
    until: until.toISOString(),
    blockedCount,
    approvedCount,
    anomalyCount,
    rateSpikeCount,
    topAnomalyTypes: anomalyByType,
    suggestedRulesCount: suggestions.length,
    suggestedRules,
  };
}

/**
 * If anomalies in the last hour exceed threshold and RISK_REPORT_WEBHOOK_URL is set,
 * POST the summary to the webhook (event-triggered alert).
 */
export async function maybeSendEventTriggeredAlert(
  anomalyCountLastHour: number,
  threshold: number = 5
): Promise<boolean> {
  const webhook = process.env.RISK_REPORT_WEBHOOK_URL;
  if (!webhook?.trim() || anomalyCountLastHour < threshold) return false;
  try {
    const summary = await buildRiskReport(1);
    const res = await fetch(webhook.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "risk_alert",
        reason: `${anomalyCountLastHour} anomalies in the last hour`,
        summary,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
