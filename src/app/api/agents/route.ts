/**
 * GET /api/agents — List agents in roster (no full API keys).
 * POST /api/agents — Add agent to roster (body: { name, apiKey }).
 */

import { NextRequest, NextResponse } from "next/server";
import { listAgents, addAgent } from "@/lib/agent-roster";

export async function GET() {
  try {
    const agents = await listAgents();
    const safe = agents.map((a) => ({
      id: a.id,
      name: a.name,
      keyHint: a.apiKey.length >= 4 ? `...${a.apiKey.slice(-4)}` : undefined,
      addedAt: a.addedAt,
    }));
    return NextResponse.json({ agents: safe });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list agents";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!name || !apiKey) {
      return NextResponse.json(
        { error: "Missing name or apiKey" },
        { status: 400 }
      );
    }
    const agent = await addAgent(name, apiKey);
    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name, addedAt: agent.addedAt },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
