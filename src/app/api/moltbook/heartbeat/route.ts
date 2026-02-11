/**
 * GET /api/moltbook/heartbeat — Return autopilot state (mode, stats, activity, anomalies).
 * POST /api/moltbook/heartbeat — Run one heartbeat. Body: { mode?: string }.
 * Anomalies are added to moltbook-pending so they appear in Decide → Social.
 * Mode and stats persist to .data/autopilot.json so they survive navigation and restarts.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { MoltbookClient } from "@/lib/moltbook";
import { listAgents, getApiKeyForAgent } from "@/lib/agent-roster";
import { addPending } from "@/lib/moltbook-pending";
import { isSystemHalted } from "@/lib/system-state";
import { recordSuccess, recordFailure } from "@/lib/security/trust-scoring";
import { getOperatorId } from "@/lib/operator";
import { getActivePairId } from "@/lib/agent-pair-store";
import { runHeartbeat } from "@/lib/heartbeat-runner";
import MoltbookAutopilot, {
  AutopilotConfig,
  AUTOPILOT_PRESETS,
  DEFAULT_ANOMALY_KEYWORDS,
  type AnomalyEvent,
  type ActivityEvent,
  type HeartbeatResult,
} from "@/lib/moltbook-autopilot";

const AUTOPILOT_STATE_PATH = path.join(process.cwd(), ".data", "autopilot.json");

type PersistedAutopilotState = {
  mode: AutopilotMode;
  lastHeartbeat: number | null;
  nextHeartbeat: number | null;
  dailyStats: { date: string; posts: number; comments: number; upvotes: number; follows: number };
  operatorId?: string;
  visibility?: "private" | "semi_public" | "network_emergent";
};

async function loadAutopilotState(): Promise<void> {
  try {
    if (!existsSync(AUTOPILOT_STATE_PATH)) return;
    const raw = await readFile(AUTOPILOT_STATE_PATH, "utf-8");
    const data = JSON.parse(raw) as PersistedAutopilotState;
    if (
      data.mode &&
      ["off", "conservative", "balanced", "aggressive", "creator", "full"].includes(data.mode)
    ) {
      currentMode = data.mode;
    }
    if (typeof data.lastHeartbeat === "number") lastHeartbeat = data.lastHeartbeat;
    if (typeof data.nextHeartbeat === "number") nextHeartbeat = data.nextHeartbeat;
    if (data.dailyStats && typeof data.dailyStats.posts === "number") {
      dailyStats = data.dailyStats;
    }
  } catch {
    // keep defaults
  }
}

async function saveAutopilotState(): Promise<void> {
  try {
    const dir = path.dirname(AUTOPILOT_STATE_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const data: PersistedAutopilotState = {
      mode: currentMode,
      lastHeartbeat,
      nextHeartbeat,
      dailyStats,
      operatorId: getOperatorId(),
      visibility: "private",
    };
    await writeFile(AUTOPILOT_STATE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[HEARTBEAT] Failed to save autopilot state:", e);
  }
}

type AutopilotMode = "off" | "conservative" | "balanced" | "aggressive" | "creator" | "full";

function getHeartbeatInterval(mode: AutopilotMode): number {
  switch (mode) {
    case "conservative":
      return 240;
    case "balanced":
      return 120;
    case "aggressive":
    case "full":
      return 60;
    case "creator":
      return 90;
    default:
      return 0;
  }
}

const DEFAULT_PERSONALITY = {
  name: "PowerCore",
  bio: "Building the marketplace and governance layer for AI agents",
  tone: "technical" as const,
  interests: ["agent marketplaces", "skill systems", "governance", "autonomous AI"],
  expertise: ["agent architecture", "marketplace design", "human-AI governance"],
  humanName: "Ian",
};

function buildConfig(mode: AutopilotMode): AutopilotConfig {
  const preset = AUTOPILOT_PRESETS[mode] ?? AUTOPILOT_PRESETS.balanced ?? AUTOPILOT_PRESETS.creator;
  return {
    mode,
    heartbeatInterval: preset.heartbeatInterval ?? 120,
    postInterval: preset.postInterval ?? 240,
    commentInterval: preset.commentInterval ?? 30,
    autoApproveUpvotes: preset.autoApproveUpvotes ?? true,
    autoApproveFollows: preset.autoApproveFollows ?? false,
    followKarmaThreshold: preset.followKarmaThreshold ?? 100,
    autoApproveComments: preset.autoApproveComments ?? false,
    autoApprovePosts: preset.autoApprovePosts ?? false,
    topics: ["agent", "marketplace", "skill", "governance", "autonomous", "ai"],
    submolts: ["general", "devtools", "agent-marketplaces", "security"],
    personality: DEFAULT_PERSONALITY,
    anomalyKeywords: DEFAULT_ANOMALY_KEYWORDS,
    maxDailyPosts: preset.maxDailyPosts ?? 6,
    maxDailyComments: preset.maxDailyComments ?? 24,
    maxDailyFollows: preset.maxDailyFollows ?? 15,
  } as AutopilotConfig;
}

// In-memory state (MVP)
let currentMode: AutopilotMode = "off";
let lastHeartbeat: number | null = null;
let nextHeartbeat: number | null = null;
let dailyStats: { date: string; posts: number; comments: number; upvotes: number; follows: number } = {
  date: new Date().toISOString().split("T")[0],
  posts: 0,
  comments: 0,
  upvotes: 0,
  follows: 0,
};
const activityStore: ActivityEvent[] = [];
type AnomalyWithId = AnomalyEvent & { pendingId?: string };
const anomalyStore: AnomalyWithId[] = [];
let heartbeatInProgress = false;

function anomalyToPendingPayload(anomaly: AnomalyEvent): Parameters<typeof addPending>[0] {
  const reason = anomaly.reason ?? "Autopilot flagged for review";
  const riskLevel = (anomaly.detectedKeywords?.length ?? 0) > 2 ? "high" : "medium";

  if (anomaly.actionType === "comment" && anomaly.post && typeof anomaly.content === "string") {
    const post = anomaly.post as { id?: string; title?: string };
    return {
      category: "social",
      actionType: "comment",
      title: "Comment (autopilot)",
      description: reason,
      reasoning: reason,
      implications: anomaly.detectedKeywords ?? [],
      riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
      moltbookPayload: {
        type: "comment",
        postId: post.id,
        content: anomaly.content,
      },
    };
  }
  if (anomaly.actionType === "follow" && anomaly.targetAgent) {
    return {
      category: "social",
      actionType: "follow",
      title: "Follow (autopilot)",
      description: `Follow @${anomaly.targetAgent}`,
      reasoning: reason,
      implications: anomaly.detectedKeywords ?? [],
      riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
      moltbookPayload: {
        type: "follow",
        agentName: anomaly.targetAgent,
      },
    };
  }
  if (anomaly.actionType === "post" && anomaly.content && typeof anomaly.content === "object") {
    const c = anomaly.content as { submolt?: string; title?: string; content?: string };
    return {
      category: "social",
      actionType: "post",
      title: c.title ?? "Post (autopilot)",
      description: reason,
      reasoning: reason,
      implications: anomaly.detectedKeywords ?? [],
      riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
      moltbookPayload: {
        type: "post",
        submolt: c.submolt ?? "general",
        title: c.title,
        content: c.content,
      },
    };
  }
  return {
    category: "social",
    actionType: "post",
    title: "Action (autopilot)",
    description: reason,
    reasoning: reason,
    implications: anomaly.detectedKeywords ?? [],
    riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
    moltbookPayload: { type: "post", submolt: "general", title: reason, content: reason },
  };
}

export async function GET() {
  await loadAutopilotState();
  return NextResponse.json({
    mode: currentMode,
    isRunning: currentMode !== "off",
    lastHeartbeat: lastHeartbeat ? new Date(lastHeartbeat).toISOString() : null,
    nextHeartbeat: nextHeartbeat ? new Date(nextHeartbeat).toISOString() : null,
    stats: dailyStats,
    recentActivity: activityStore.slice(0, 20),
    anomalies: anomalyStore.slice(0, 10).map((a) => ({
      ...a,
      id: a.pendingId,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (heartbeatInProgress) {
    return NextResponse.json({ skipped: true, reason: "Already running" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    await loadAutopilotState();

    if (await isSystemHalted()) {
      return NextResponse.json({ skipped: true, reason: "System halted" });
    }

    const modeParam = body.mode as string | undefined;
    if (
      modeParam &&
      ["off", "conservative", "balanced", "aggressive", "creator", "full"].includes(modeParam)
    ) {
      currentMode = modeParam as AutopilotMode;
      await saveAutopilotState();
    }

    const roster = await listAgents();
    const apiKey =
      (roster[0] ? await getApiKeyForAgent(roster[0].id) : null) ?? process.env.MOLTBOOK_API_KEY ?? null;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Moltbook API key not configured. Add an agent to the roster or set MOLTBOOK_API_KEY." },
        { status: 400 }
      );
    }

    const interval = getHeartbeatInterval(currentMode);
    if (lastHeartbeat && interval > 0) {
      const minutesSince = (Date.now() - lastHeartbeat) / 60000;
      if (minutesSince < interval) {
        return NextResponse.json({ skipped: true, reason: "Too soon" });
      }
    }

    heartbeatInProgress = true;
    const config = buildConfig(currentMode);
    const client = new MoltbookClient(apiKey);
    const autopilot = new MoltbookAutopilot(client, config, {
      onAnomaly: async (anomaly: AnomalyEvent) => {
        let pendingId: string | undefined;
        if (anomaly.type === "pending_approval") {
          const payload = anomalyToPendingPayload(anomaly);
          const item = await addPending(payload);
          pendingId = item.id;
        }
        anomalyStore.unshift({ ...anomaly, pendingId });
      },
      onActivity: (activity: ActivityEvent) => {
        activityStore.unshift(activity);
      },
    });

    const result: HeartbeatResult = await autopilot.heartbeat();

    if (!result.skipped && result.actions?.length) {
      const opMap: Record<string, string> = {
        upvote: "write:moltbook_upvote",
        comment: "write:moltbook_comment",
        follow: "write:moltbook_follow",
        post: "write:moltbook_post",
      };
      for (const a of result.actions) {
        const opKey = opMap[a.action] ?? `write:moltbook_${a.action}`;
        const target = a.postId ?? a.agent ?? a.post ? String((a.post as { id?: string })?.id ?? "") : undefined;
        if (a.success) {
          recordSuccess(opKey, target, undefined, getOperatorId()).catch(() => {});
        } else {
          recordFailure(opKey, target, undefined, getOperatorId()).catch(() => {});
        }
      }
    }

    if (!result.skipped && result.stats) {
      dailyStats = result.stats;
    }

    // The Nightly Build: pair-aware heartbeat (record activity)
    try {
      const activePairId = await getActivePairId();
      await runHeartbeat(activePairId);
    } catch (e) {
      console.warn("[HEARTBEAT] runHeartbeat failed:", e);
    }

    lastHeartbeat = Date.now();
    nextHeartbeat = interval > 0 ? lastHeartbeat + interval * 60 * 1000 : null;
    await saveAutopilotState();

    return NextResponse.json({
      success: true,
      result,
      stats: dailyStats,
      lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      nextHeartbeat: nextHeartbeat ? new Date(nextHeartbeat).toISOString() : null,
      recentActivity: activityStore.slice(0, 20),
      anomalies: anomalyStore.slice(0, 10).map((a) => ({ ...a, id: a.pendingId })),
    });
  } catch (error) {
    console.error("[HEARTBEAT ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  } finally {
    heartbeatInProgress = false;
  }
}
