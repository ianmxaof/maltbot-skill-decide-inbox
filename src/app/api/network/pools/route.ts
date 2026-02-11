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
import {
  getPoolsForGroup,
  createPool,
  addVote,
  closePool,
} from "@/lib/network-store";
import type { DecisionPool } from "@/types/network";

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
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "create") {
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const createdBy = typeof body.createdBy === "string" ? body.createdBy.trim() : "";

      if (!groupId || !title || !createdBy) {
        return NextResponse.json(
          { success: false, error: "Missing groupId, title, or createdBy" },
          { status: 400 }
        );
      }

      const options = Array.isArray(body.options)
        ? body.options.filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
        : [];

      if (options.length < 2 || options.length > 5) {
        return NextResponse.json(
          { success: false, error: "Provide 2-5 options" },
          { status: 400 }
        );
      }

      const pool: DecisionPool = {
        id: `pool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        groupId,
        title,
        description: typeof body.description === "string" ? body.description.trim() : "",
        status: "open",
        item: {
          title,
          context: typeof body.context === "string" ? body.context.trim() : "",
          options,
          sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : undefined,
          sourceType: typeof body.sourceType === "string" ? body.sourceType.trim() : undefined,
        },
        votes: [],
        quorum: typeof body.quorum === "number" ? body.quorum : 3,
        consensusThreshold: typeof body.consensusThreshold === "number" ? body.consensusThreshold : 0.6,
        createdBy,
        createdAt: new Date().toISOString(),
      };

      await createPool(pool);
      return NextResponse.json({ success: true, pool });
    }

    if (action === "vote") {
      const poolId = typeof body.poolId === "string" ? body.poolId.trim() : "";
      const pairId = typeof body.pairId === "string" ? body.pairId.trim() : "";
      const choiceIndex = typeof body.choiceIndex === "number" ? body.choiceIndex : -1;

      if (!poolId || !pairId || choiceIndex < 0) {
        return NextResponse.json(
          { success: false, error: "Missing poolId, pairId, or choiceIndex" },
          { status: 400 }
        );
      }

      const pool = await addVote(poolId, {
        pairId,
        choiceIndex,
        reasoning: typeof body.reasoning === "string" ? body.reasoning.trim() : undefined,
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

    if (action === "close") {
      const poolId = typeof body.poolId === "string" ? body.poolId.trim() : "";
      if (!poolId) {
        return NextResponse.json(
          { success: false, error: "Missing poolId" },
          { status: 400 }
        );
      }

      const pool = await closePool(poolId);
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
