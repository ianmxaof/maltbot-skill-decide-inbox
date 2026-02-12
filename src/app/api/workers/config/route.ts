// Workers pull their config from here on startup and when configChanged = true.
// Dashboard pushes config updates through PUT.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  getWorkerConfig,
  setWorkerConfig,
  addWatcherToConfig,
  removeWatcherFromConfig,
  getWorkerById,
} from "@/lib/worker-store";
import { validateWorkerAuth } from "@/lib/worker-auth";
import type { WorkerConfig, WatcherConfig } from "@/types/worker";

// ── Zod schemas ────────────────────────────────────────────
const PutConfigSchema = z.object({
  workerId: z.string().min(1, "workerId is required"),
  config: z.record(z.unknown()).optional(),
});

const AddWatcherSchema = z.object({
  workerId: z.string().min(1, "workerId is required"),
  action: z.literal("add_watcher"),
  watcher: z.record(z.unknown()).refine((v) => v !== null && v !== undefined, {
    message: "watcher object required",
  }),
  watcherId: z.string().optional(),
});

const RemoveWatcherSchema = z.object({
  workerId: z.string().min(1, "workerId is required"),
  action: z.literal("remove_watcher"),
  watcherId: z.string().min(1, "watcherId required"),
  watcher: z.record(z.unknown()).optional(),
});

const PostConfigSchema = z.discriminatedUnion("action", [
  AddWatcherSchema,
  RemoveWatcherSchema,
]);

// GET: worker pulls its config
export async function GET(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
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
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(PutConfigSchema, body);
    if (!parsed.ok) return parsed.response;
    const { workerId, config } = parsed.data;

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
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(PostConfigSchema, body);
    if (!parsed.ok) return parsed.response;
    const { workerId, action } = parsed.data;

    if (action === "add_watcher") {
      const watcher = parsed.data.watcher as WatcherConfig;
      const config = await addWatcherToConfig(workerId, watcher);
      return NextResponse.json(config);
    }

    if (action === "remove_watcher") {
      const { watcherId } = parsed.data;
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
