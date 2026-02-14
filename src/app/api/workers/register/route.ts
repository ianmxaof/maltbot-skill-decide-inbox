// Worker registration: workers call this on startup to announce themselves.
// Returns worker ID and initial config.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  registerWorker,
  generateDefaultConfig,
  getWorkerConfig,
  getAllWorkers,
  getWorkersForPair,
  removeWorker,
} from "@/lib/worker-store";
import { validateWorkerAuth } from "@/lib/worker-auth";

const capabilityEnum = z.enum([
  "web_monitor",
  "github_monitor",
  "reddit_monitor",
  "code_analysis",
  "text_generation",
  "image_analysis",
  "summarization",
  "classification",
]);

// ── Zod schema ─────────────────────────────────────────────
const RegisterWorkerSchema = z.object({
  pairId: z.string().min(1, "pairId is required"),
  name: z.string().min(1, "name is required"),
  aspect: z.enum(["golem", "prometheus", "odin", "hermes", "custom"]),
  hostname: z.string().min(1, "hostname is required"),
  ollamaModel: z.string().min(1, "ollamaModel is required"),
  platform: z.string().default("unknown"),
  ollamaUrl: z.string().default("http://localhost:11434"),
  capabilities: z.array(capabilityEnum).default([]),
  version: z.string().default("0.1.0"),
});

// POST: register a new worker (or re-register existing)
export async function POST(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(RegisterWorkerSchema, body);
    if (!parsed.ok) return parsed.response;

    const {
      pairId,
      name,
      aspect,
      hostname,
      ollamaModel,
      platform,
      ollamaUrl,
      capabilities,
      version,
    } = parsed.data;

    const worker = await registerWorker({
      pairId,
      name,
      aspect,
      hostname,
      platform,
      ollamaModel,
      ollamaUrl,
      capabilities,
      version,
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
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
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
