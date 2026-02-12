// Workers POST heartbeats here every minute.
// Platform records status and returns any pending instructions.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  getWorkerById,
  updateWorkerStatus,
  recordHeartbeat,
  getWorkerConfig,
  reconcileWorkerStatuses,
} from "@/lib/worker-store";
import { validateWorkerAuth } from "@/lib/worker-auth";
import type { WorkerHeartbeat } from "@/types/worker";

// ── Zod schema ─────────────────────────────────────────────
const WorkerErrorSchema = z.object({
  timestamp: z.string(),
  source: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
});

const HeartbeatSchema = z.object({
  workerId: z.string().min(1, "workerId is required"),
  status: z.enum(["online", "idle", "working", "offline", "error"]),
  timestamp: z.string(),
  activeWatchers: z.number(),
  queueDepth: z.number(),
  currentTask: z.string().optional(),
  itemsProcessed: z.number(),
  itemsSurfaced: z.number(),
  ollamaCallCount: z.number(),
  tokensUsed: z.number(),
  errors: z.array(WorkerErrorSchema),
  memoryUsageMb: z.number(),
  ollamaAvailable: z.boolean(),
  ollamaModel: z.string(),
  uptimeSeconds: z.number(),
});

export async function POST(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(HeartbeatSchema, body);
    if (!parsed.ok) return parsed.response;
    const heartbeat: WorkerHeartbeat = parsed.data;

    const worker = await getWorkerById(heartbeat.workerId);
    if (!worker) {
      return NextResponse.json(
        { error: "Worker not registered" },
        { status: 404 }
      );
    }

    await recordHeartbeat(heartbeat);

    await updateWorkerStatus(heartbeat.workerId, heartbeat.status, {
      uptimeSeconds: heartbeat.uptimeSeconds,
      tokensProcessed: (worker.tokensProcessed ?? 0) + heartbeat.tokensUsed,
      ...(heartbeat.itemsProcessed > 0 && {
        lastActivityAt: new Date().toISOString(),
        totalItemsIngested: (worker.totalItemsIngested ?? 0) + heartbeat.itemsProcessed,
      }),
    });

    const config = await getWorkerConfig(heartbeat.workerId);
    const configChanged =
      config && config.configVersion > worker.configVersion;

    return NextResponse.json({
      ack: true,
      configChanged,
      ...(configChanged && { newConfigVersion: config!.configVersion }),
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: "Heartbeat failed", detail: err.message },
      { status: 500 }
    );
  }
}

// GET: reconcile statuses (called by cron or manually)
export async function GET(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    await reconcileWorkerStatuses();
    return NextResponse.json({ reconciled: true });
  } catch {
    return NextResponse.json(
      { error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}
