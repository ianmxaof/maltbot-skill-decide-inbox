import { NextRequest, NextResponse } from "next/server";
import { getAnomalyDetector } from "@/lib/security/anomaly-detector";

/**
 * POST /api/security/anomalies/[id]/review
 * Mark an anomaly as reviewed
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detector = getAnomalyDetector();
    const ok = detector.markReviewed(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Anomaly not found or already reviewed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] security/anomalies/[id]/review:", error);
    return NextResponse.json(
      { error: "Failed to mark reviewed" },
      { status: 500 }
    );
  }
}
