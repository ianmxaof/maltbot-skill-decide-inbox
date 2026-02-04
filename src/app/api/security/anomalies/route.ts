import { NextRequest, NextResponse } from "next/server";
import { getAnomalyDetector } from "@/lib/security/anomaly-detector";

/**
 * GET /api/security/anomalies
 * Returns anomaly events. Query: since (ISO date), limit (number)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    const limitParam = searchParams.get("limit");
    const since = sinceParam ? new Date(sinceParam) : undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

    const detector = getAnomalyDetector();
    const events = detector.getEvents(since);
    const sliced = events.slice(-limit).reverse();

    const serialized = sliced.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      type: e.type,
      severity: e.severity,
      source: e.source,
      description: e.description,
      actionTaken: e.actionTaken,
      requiresReview: e.requiresReview,
      context: e.context,
    }));

    return NextResponse.json({ anomalies: serialized });
  } catch (error) {
    console.error("[API] security/anomalies:", error);
    return NextResponse.json(
      { error: "Failed to get anomalies" },
      { status: 500 }
    );
  }
}
