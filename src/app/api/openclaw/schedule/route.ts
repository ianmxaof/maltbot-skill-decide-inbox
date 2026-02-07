/**
 * GET /api/openclaw/schedule — list scheduled jobs
 * POST /api/openclaw/schedule — add job (body: { type, cron, label, config? })
 * DELETE /api/openclaw/schedule?id= — remove job
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listScheduledJobs,
  addScheduledJob,
  removeScheduledJob,
  type ScheduledJobType,
} from "@/lib/openclaw-scheduler";

const VALID_TYPES: ScheduledJobType[] = [
  "daily_briefing",
  "weekly_report",
  "reminder",
  "heartbeat",
  "custom",
];

function isValidType(t: string): t is ScheduledJobType {
  return VALID_TYPES.includes(t as ScheduledJobType);
}

export async function GET() {
  try {
    const jobs = await listScheduledJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list schedule";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, cron, label, config } = body as {
      type?: string;
      cron?: string;
      label?: string;
      config?: Record<string, unknown>;
    };
    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type (daily_briefing|weekly_report|reminder|heartbeat|custom)" },
        { status: 400 }
      );
    }
    if (!cron || typeof cron !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing cron expression (e.g. 0 8 * * * for 8am daily)" },
        { status: 400 }
      );
    }
    const job = await addScheduledJob({
      type: type as ScheduledJobType,
      cron,
      label: typeof label === "string" ? label : type,
      config: config && typeof config === "object" ? config : undefined,
    });
    return NextResponse.json({ success: true, job });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add job";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 }
      );
    }
    const removed = await removeScheduledJob(id);
    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove job";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
