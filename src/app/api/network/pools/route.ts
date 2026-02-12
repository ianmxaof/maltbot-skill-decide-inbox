/**
 * GET /api/network/pools — List decision pools for a group
 * POST /api/network/pools — Create a decision pool or cast a vote
 *
 * Query (GET): groupId (required), status? (open|closed|resolved)
 * Body (POST create): { action: "create", groupId, title, description, options[], quorum?, consensusThreshold?, createdBy }
 * Body (POST vote): { action: "vote", poolId, pairId, choiceIndex, reasoning? }
 * Body (POST close): { action: "close", poolId }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  getPoolsForGroup,
  createPool,
  addVote,
  closePool,
} from "@/lib/network-store";
import type { DecisionPool } from "@/types/network";

const CreatePoolSchema = z.object({
  action: z.literal("create"),
  groupId: z.string().trim().min(1, "Missing groupId"),
  title: z.string().trim().min(1, "Missing title"),
  description: z.string().trim().default(""),
  options: z
    .array(z.string().trim().min(1))
    .min(2, "Provide 2-5 options")
    .max(5, "Provide 2-5 options"),
  context: z.string().trim().default(""),
  sourceUrl: z.string().trim().optional(),
  sourceType: z.string().trim().optional(),
  quorum: z.number().default(3),
  consensusThreshold: z.number().default(0.6),
  createdBy: z.string().trim().min(1, "Missing createdBy"),
});

const VotePoolSchema = z.object({
  action: z.literal("vote"),
  poolId: z.string().trim().min(1, "Missing poolId"),
  pairId: z.string().trim().min(1, "Missing pairId"),
  choiceIndex: z.number().min(0, "choiceIndex must be >= 0"),
  reasoning: z.string().trim().optional(),
});

const ClosePoolSchema = z.object({
  action: z.literal("close"),
  poolId: z.string().trim().min(1, "Missing poolId"),
});

const PoolActionSchema = z.discriminatedUnion("action", [
  CreatePoolSchema,
  VotePoolSchema,
  ClosePoolSchema,
]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get("groupId")?.trim() ?? "";
    const status = url.searchParams.get("status")?.trim();

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Missing groupId" },
        { status: 400 }
      );
    }

    let pools = await getPoolsForGroup(groupId);
    if (status) {
      pools = pools.filter((p) => p.status === status);
    }

    return NextResponse.json({ success: true, pools, count: pools.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get pools";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(PoolActionSchema, body);
    if (!parsed.ok) return parsed.response;

    const data = parsed.data;

    if (data.action === "create") {
      const pool: DecisionPool = {
        id: `pool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        groupId: data.groupId,
        title: data.title,
        description: data.description,
        status: "open",
        item: {
          title: data.title,
          context: data.context,
          options: data.options,
          sourceUrl: data.sourceUrl,
          sourceType: data.sourceType,
        },
        votes: [],
        quorum: data.quorum,
        consensusThreshold: data.consensusThreshold,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
      };

      await createPool(pool);
      return NextResponse.json({ success: true, pool });
    }

    if (data.action === "vote") {
      const pool = await addVote(data.poolId, {
        pairId: data.pairId,
        choiceIndex: data.choiceIndex,
        reasoning: data.reasoning,
        votedAt: new Date().toISOString(),
      });

      if (!pool) {
        return NextResponse.json(
          { success: false, error: "Pool not found, already voted, or pool is closed" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, pool });
    }

    if (data.action === "close") {
      const pool = await closePool(data.poolId);
      if (!pool) {
        return NextResponse.json(
          { success: false, error: "Pool not found or already closed" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, pool });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action. Use: create, vote, close" },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to process pool action";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
