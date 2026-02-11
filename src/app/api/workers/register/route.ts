// Worker registration: workers call this on startup to announce themselves.
// Returns worker ID and initial config.

import { NextRequest, NextResponse } from "next/server";
import {
  registerWorker,
  generateDefaultConfig,
  getWorkerConfig,
  getAllWorkers,
  getWorkersForPair,
  removeWorker,
} from "@/lib/worker-store";

// POST: register a new worker (or re-register existing)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      pairId,
      name,
      aspect,
      hostname,
      platform,
      ollamaModel,
      ollamaUrl,
      capabilities,
      version,
    } = body;

    if (!pairId || !name || !aspect || !hostname || !ollamaModel) {
      return NextResponse.json(
        {
          error: "Missing required fields: pairId, name, aspect, hostname, ollamaModel",
        },
        { status: 400 }
      );
    }

    const worker = await registerWorker({
      pairId,
      name,
      aspect,
      hostname,
      platform: platform ?? "unknown",
      ollamaModel,
      ollamaUrl: ollamaUrl ?? "http://localhost:11434",
      capabilities: capabilities ?? [],
      version: version ?? "0.1.0",
    });

    let config = await getWorkerConfig(worker.id);
    if (!config) {
      config = await generateDefaultConfig(worker);
    }

    return NextResponse.json({
      worker,
      config,
      message: "Worker registered successfully",
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: "Registration failed", detail: err.message },
      { status: 500 }
    );
  }
}

// GET: list workers
export async function GET(req: NextRequest) {
  try {
    const pairId = req.nextUrl.searchParams.get("pairId");

    if (pairId) {
      const workers = await getWorkersForPair(pairId);
      return NextResponse.json(workers);
    }

    const workers = await getAllWorkers();
    return NextResponse.json(workers);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch workers" },
      { status: 500 }
    );
  }
}

// DELETE: unregister a worker
export async function DELETE(req: NextRequest) {
  try {
    const workerId = req.nextUrl.searchParams.get("workerId");
    if (!workerId) {
      return NextResponse.json(
        { error: "workerId required" },
        { status: 400 }
      );
    }
    const removed = await removeWorker(workerId);
    if (!removed) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove worker" },
      { status: 500 }
    );
  }
}
