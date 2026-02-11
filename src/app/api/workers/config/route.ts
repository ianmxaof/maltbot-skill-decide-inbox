// Workers pull their config from here on startup and when configChanged = true.
// Dashboard pushes config updates through PUT.

import { NextRequest, NextResponse } from "next/server";
import {
  getWorkerConfig,
  setWorkerConfig,
  addWatcherToConfig,
  removeWatcherFromConfig,
  getWorkerById,
} from "@/lib/worker-store";
import type { WorkerConfig, WatcherConfig } from "@/types/worker";

// GET: worker pulls its config
export async function GET(req: NextRequest) {
  try {
    const workerId = req.nextUrl.searchParams.get("workerId");
    if (!workerId) {
      return NextResponse.json(
        { error: "workerId required" },
        { status: 400 }
      );
    }

    const config = await getWorkerConfig(workerId);
    if (!config) {
      return NextResponse.json(
        { error: "Config not found — register first" },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

// PUT: dashboard updates worker config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { workerId, config } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId required" },
        { status: 400 }
      );
    }

    const worker = await getWorkerById(workerId);
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const existing = await getWorkerConfig(workerId);
    if (!existing) {
      return NextResponse.json({ error: "No config found" }, { status: 404 });
    }

    const updated: WorkerConfig = {
      ...existing,
      ...config,
      workerId,
      pairId: existing.pairId,
      configVersion: existing.configVersion + 1,
    };

    await setWorkerConfig(workerId, updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}

// POST: add/remove watchers (convenience endpoint)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workerId, action } = body;

    if (!workerId || !action) {
      return NextResponse.json(
        { error: "workerId and action required" },
        { status: 400 }
      );
    }

    if (action === "add_watcher") {
      const watcher: WatcherConfig = body.watcher;
      if (!watcher) {
        return NextResponse.json(
          { error: "watcher object required" },
          { status: 400 }
        );
      }
      const config = await addWatcherToConfig(workerId, watcher);
      return NextResponse.json(config);
    }

    if (action === "remove_watcher") {
      const { watcherId } = body;
      if (!watcherId) {
        return NextResponse.json(
          { error: "watcherId required" },
          { status: 400 }
        );
      }
      const config = await removeWatcherFromConfig(workerId, watcherId);
      return NextResponse.json(config);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Failed to modify config" },
      { status: 500 }
    );
  }
}
