// THE critical bridge between local workers and the platform.
//
// Workers POST discovered items here. The platform:
// 1. Deduplicates (content hash check)
// 2. Routes to Decide Inbox (if urgency >= medium or confidence >= 0.7)
// 3. Projects to social activity feed (for network convergence detection)
// 4. Returns feedback to the worker

import { NextRequest, NextResponse } from "next/server";
import {
  isDuplicate,
  markIngested,
  getWorkerById,
  updateWorkerStatus,
} from "@/lib/worker-store";
import { createNetworkActivity } from "@/lib/social-store";
import type { IngestItem, IngestResponse, IngestItemType } from "@/types/worker";
import type { NetworkActivityType } from "@/types/social";

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DECIDE_QUEUE_FILE = "worker-decide-queue.json";

interface DecideQueueItem {
  id: string;
  ingestItemId: string;
  workerId: string;
  pairId: string;
  title: string;
  summary: string;
  detail?: string;
  sourceUrl?: string;
  sourceName: string;
  urgency: string;
  confidence: number;
  suggestedAction?: string;
  actionRationale?: string;
  options?: { label: string; description: string; risk: string }[];
  signalKeys: string[];
  tags: string[];
  status: "pending" | "approved" | "ignored" | "escalated";
  ingestedAt: string;
  decidedAt?: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readDecideQueue(): Promise<DecideQueueItem[]> {
  try {
    const raw = await fs.readFile(
      path.join(DATA_DIR, DECIDE_QUEUE_FILE),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDecideQueue(items: DecideQueueItem[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    path.join(DATA_DIR, DECIDE_QUEUE_FILE),
    JSON.stringify(items, null, 2),
    "utf-8"
  );
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function shouldRouteToDecideInbox(item: IngestItem): boolean {
  if (item.urgency === "critical" || item.urgency === "high") return true;
  if (item.confidence >= 0.7) return true;
  if (item.urgency === "medium" && item.confidence >= 0.5) return true;
  if (item.suggestedAction === "escalate") return true;
  if (item.type === "threat" || item.type === "bug") return true;
  return false;
}

function mapIngestTypeToActivityType(type: IngestItemType): NetworkActivityType {
  switch (type) {
    case "opportunity":
    case "collaboration":
      return "signal";
    case "threat":
    case "bug":
      return "agent_action";
    case "release":
    case "trend":
      return "context_change";
    case "discussion":
    case "content_idea":
    case "competitor":
      return "signal";
    default:
      return "agent_action";
  }
}

function buildActivitySummary(item: IngestItem): string {
  const actionVerb: Record<string, string> = {
    opportunity: "Discovered opportunity",
    threat: "Flagged threat",
    trend: "Detected trend",
    discussion: "Found discussion",
    release: "Noticed release",
    bug: "Detected vulnerability",
    content_idea: "Found content inspiration",
    competitor: "Spotted competitive signal",
    collaboration: "Found collaboration opportunity",
  };
  return `${actionVerb[item.type] ?? "Surfaced item"}: ${item.title}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const items: IngestItem[] = Array.isArray(body) ? body : [body];
    const results: IngestResponse[] = [];

    for (const item of items) {
      if (
        !item.workerId ||
        !item.pairId ||
        !item.title ||
        !item.contentHash
      ) {
        results.push({
          accepted: false,
          reason:
            "Missing required fields: workerId, pairId, title, contentHash",
          routedTo: "dropped",
        });
        continue;
      }

      const worker = await getWorkerById(item.workerId);
      if (!worker) {
        results.push({
          accepted: false,
          reason: "Worker not registered",
          routedTo: "dropped",
        });
        continue;
      }

      if (await isDuplicate(item.contentHash)) {
        results.push({
          accepted: false,
          reason: "Duplicate item (seen in last 24h)",
          routedTo: "dropped",
        });
        continue;
      }

      await markIngested(item.contentHash);

      const itemId = genId("ing");

      const toDecide = shouldRouteToDecideInbox(item);

      if (toDecide) {
        const queue = await readDecideQueue();
        queue.push({
          id: genId("dq"),
          ingestItemId: itemId,
          workerId: item.workerId,
          pairId: item.pairId,
          title: item.title,
          summary: item.summary,
          detail: item.detail,
          sourceUrl: item.sourceUrl,
          sourceName: item.sourceName,
          urgency: item.urgency,
          confidence: item.confidence,
          suggestedAction: item.suggestedAction,
          actionRationale: item.actionRationale,
          options: item.options,
          signalKeys: item.signalKeys,
          tags: item.tags,
          status: "pending",
          ingestedAt: new Date().toISOString(),
        });

        const trimmed = queue.slice(-200);
        await writeDecideQueue(trimmed);
      }

      await createNetworkActivity({
        pairId: item.pairId,
        type: mapIngestTypeToActivityType(item.type),
        summary: buildActivitySummary(item),
        detail:
          item.summary +
          (item.sourceUrl
            ? ` [${item.sourceName}](${item.sourceUrl})`
            : ""),
        visibility: "public",
        sourceEventId: itemId,
      });

      await updateWorkerStatus(item.workerId, "working", {
        lastActivityAt: new Date().toISOString(),
        totalItemsIngested: (worker.totalItemsIngested ?? 0) + 1,
        ...(toDecide && {
          totalDecisionsSurfaced: (worker.totalDecisionsSurfaced ?? 0) + 1,
        }),
      });

      results.push({
        accepted: true,
        itemId,
        routedTo: toDecide ? "decide_inbox" : "feed_only",
      });
    }

    return NextResponse.json({
      results,
      accepted: results.filter((r) => r.accepted).length,
      dropped: results.filter((r) => !r.accepted).length,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: "Ingest failed", detail: err.message },
      { status: 500 }
    );
  }
}

// GET: read the Decide Queue (for the dashboard)
export async function GET(req: NextRequest) {
  try {
    const pairId = req.nextUrl.searchParams.get("pairId");
    const status = req.nextUrl.searchParams.get("status") ?? "pending";

    let queue = await readDecideQueue();

    if (pairId) queue = queue.filter((q) => q.pairId === pairId);
    if (status !== "all") queue = queue.filter((q) => q.status === status);

    queue.sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt));

    return NextResponse.json(queue);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
