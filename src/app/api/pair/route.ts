/**
 * GET /api/pair — List pairs (or get active pair info).
 * POST /api/pair — Create a new pair.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  listPairs,
  getPair,
  getActivePairId,
  createPair,
  setActivePairId,
} from "@/lib/agent-pair-store";
import type { CreatePairInput } from "@/lib/agent-pair-store";
import { completeOnboarding } from "@/lib/disclosure-store";

const CreatePairSchema = z.object({
  humanName: z.string().trim().min(1, "humanName is required"),
  agentName: z.string().trim().default("Agent"),
  agentPowerCoreId: z.string().optional(),
  operatingPhilosophy: z
    .enum(["ship-while-sleep", "review-before-deploy", "collaborative", "research-only"])
    .default("review-before-deploy"),
  autonomyTiers: z
    .object({
      tier1: z.array(z.string()).default([]),
      tier2: z.array(z.string()).default([]),
      tier3: z.array(z.string()).default([]),
    })
    .default({
      tier1: ["file organization", "research & drafts", "memory maintenance"],
      tier2: ["code changes", "documentation updates"],
      tier3: ["public posts", "financial decisions", "external communications"],
    }),
  activityPattern: z.any().optional(),
  humanPreferences: z.any().optional(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  contextSources: z
    .object({
      githubRepos: z.array(z.string()).default([]),
      githubUsers: z.array(z.string()).default([]),
      rssUrls: z.array(z.string()).default([]),
      moltbookTopics: z.array(z.string()).default([]),
    })
    .default({
      githubRepos: [],
      githubUsers: [],
      rssUrls: [],
      moltbookTopics: [],
    }),
  soulMd: z.string().optional(),
  publicNarrative: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const active = searchParams.get("active");

    if (id) {
      const { getPairById } = await import("@/lib/agent-pair-store");
      const pair = await getPairById(id);
      if (!pair) {
        return NextResponse.json({ success: false, error: "Pair not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, pair });
    }

    if (active === "true" || active === "1") {
      const pair = await getPair();
      const activeId = await getActivePairId();
      return NextResponse.json({ success: true, pair, activePairId: activeId });
    }

    const pairs = await listPairs();
    return NextResponse.json({ success: true, pairs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get pairs";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(CreatePairSchema, body);
    if (!parsed.ok) return parsed.response;

    const input: CreatePairInput = parsed.data;

    if (!input.humanName) {
      return NextResponse.json({ success: false, error: "humanName is required" }, { status: 400 });
    }

    const pair = await createPair(input);
    await setActivePairId(pair.id);
    // Initialize disclosure state — transition from onboarding → activation
    await completeOnboarding(pair.id).catch((e) => console.error("[pair] completeOnboarding failed:", e));
    return NextResponse.json({ success: true, pair });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create pair";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
