/**
 * POST /api/openclaw/schedule/run — run due jobs (mark as run, update nextRun).
 * Call from external cron every minute or from heartbeat.
 */

import { NextResponse } from "next/server";
import { runDueJobs } from "@/lib/openclaw-scheduler";

export async function POST() {
  try {
    const due = await runDueJobs();
    return NextResponse.json({
      success: true,
      ran: due.length,
      jobs: due.map((j) => ({ id: j.id, type: j.type, label: j.label })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to run schedule";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
