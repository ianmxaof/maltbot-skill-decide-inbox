// THE critical bridge between local workers and the platform.
//
// Workers POST discovered items here. The platform:
// 1. Deduplicates (content hash check)
// 2. Routes to Decide Inbox (if urgency >= medium or confidence >= 0.7)
// 3. Projects to social activity feed (for network convergence detection)
// 4. Returns feedback to the worker

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  isDuplicate,
  markIngested,
  getWorkerById,
  updateWorkerStatus,
} from "@/lib/worker-store";
import { createNetworkActivity } from "@/lib/social-store";
import { recordWorkerIngest as recordDisclosureIngest } from "@/lib/disclosure-store";
import { createAgentDiscoveryThrottled } from "@/lib/notification-store";
import { validateWorkerAuth } from "@/lib/worker-auth";
import {
  shouldRouteToDecideInbox,
  mapIngestTypeToActivityType,
  buildActivitySummary,
} from "@/lib/ingest-utils";
import type { IngestItem, IngestResponse } from "@/types/worker";

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

// ── Zod schemas ────────────────────────────────────────────
const IngestOptionSchema = z.object({
  label: z.string(),
  description: z.string(),
  risk: z.enum(["low", "medium", "high"]),
});

const IngestItemSchema = z.object({
  workerId: z.string().min(1, "workerId is required"),
  pairId: z.string().min(1, "pairId is required"),
  type: z.enum([
    "opportunity",
    "threat",
    "trend",
    "discussion",
    "release",
    "bug",
    "content_idea",
    "competitor",
    "collaboration",
  ]),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number(),
  title: z.string().min(1, "title is required"),
  summary: z.string(),
  detail: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceName: z.string(),
  sourceType: z.enum([
    "rss_feed",
    "github_repo",
    "github_issues",
    "github_releases",
    "reddit_subreddit",
    "hacker_news",
    "web_page",
    "twitter_search",
    "custom_script",
  ]),
  suggestedAction: z.enum(["approve", "escalate", "investigate", "ignore"]).optional(),
  actionRationale: z.string().optional(),
  options: z.array(IngestOptionSchema).optional(),
  signalKeys: z.array(z.string()),
  tags: z.array(z.string()),
  contentHash: z.string().min(1, "contentHash is required"),
  discoveredAt: z.string(),
});

const IngestBodySchema = z
  .union([z.array(IngestItemSchema), IngestItemSchema])
  .transform((d) => (Array.isArray(d) ? d : [d]));

export async function POST(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(IngestBodySchema, body);
    if (!parsed.ok) return parsed.response;

    const items: IngestItem[] = parsed.data;
    const results: IngestResponse[] = [];

    for (const item of items) {
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

    // Record in disclosure state and notify
    const acceptedItems = results.filter((r) => r.accepted);
    if (acceptedItems.length > 0 && items[0]?.pairId) {
      await recordDisclosureIngest(items[0].pairId, acceptedItems.length).catch((e) => console.error("[workers/ingest] recordDisclosureIngest failed:", e));
      await createAgentDiscoveryThrottled(items[0].pairId, acceptedItems.length).catch((e) => console.error("[workers/ingest] createAgentDiscoveryThrottled failed:", e));
    }

    return NextResponse.json({
      results,
      accepted: acceptedItems.length,
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
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
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
