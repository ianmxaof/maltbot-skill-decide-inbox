/**
 * GET /api/openclaw/schedule — list scheduled jobs
 * POST /api/openclaw/schedule — add job (body: { type, cron, label, config? })
 * DELETE /api/openclaw/schedule?id= — remove job
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  listScheduledJobs,
  addScheduledJob,
  removeScheduledJob,
  type ScheduledJobType,
} from "@/lib/openclaw-scheduler";

const PostScheduleSchema = z.object({
  type: z.enum(["daily_briefing", "weekly_report", "reminder", "heartbeat", "custom"]),
  cron: z.string().min(1, "Missing cron expression (e.g. 0 8 * * * for 8am daily)"),
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

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
    const parsed = parseBody(PostScheduleSchema, body);
    if (!parsed.ok) return parsed.response;
    const { type, cron, label, config } = parsed.data;

    const job = await addScheduledJob({
      type: type as ScheduledJobType,
      cron,
      label: label ?? type,
      config,
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
