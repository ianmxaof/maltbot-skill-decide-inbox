// Workers POST heartbeats here every minute.
// Platform records status and returns any pending instructions.

import { NextRequest, NextResponse } from "next/server";
import {
  getWorkerById,
  updateWorkerStatus,
  recordHeartbeat,
  getWorkerConfig,
  reconcileWorkerStatuses,
} from "@/lib/worker-store";
import type { WorkerHeartbeat } from "@/types/worker";

export async function POST(req: NextRequest) {
  try {
    const heartbeat: WorkerHeartbeat = await req.json();

    if (!heartbeat.workerId) {
      return NextResponse.json(
        { error: "workerId required" },
        { status: 400 }
      );
    }

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
export async function GET() {
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
