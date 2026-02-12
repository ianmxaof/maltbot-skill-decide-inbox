/**
 * Task Specs API
 *
 * GET  /api/task-specs              — List specs for a pair
 * POST /api/task-specs              — Create a new spec (from template or custom)
 * POST /api/task-specs?action=...   — activate / complete / update
 */

import { NextRequest, NextResponse } from "next/server";
import { getActivePairId } from "@/lib/agent-pair-store";
import {
  createTaskSpec,
  getSpecsForPair,
  getSpec,
  activateSpec,
  completeSpec,
  updateSpecConstraints,
} from "@/lib/task-spec-store";
import { SPEC_TEMPLATES } from "@/types/task-spec";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get("pairId") ?? await getActivePairId();

    // Single spec
    const specId = searchParams.get("id");
    if (specId) {
      const spec = await getSpec(specId);
      if (!spec) return NextResponse.json({ error: "Spec not found" }, { status: 404 });
      return NextResponse.json({ spec });
    }

    // Templates
    if (searchParams.get("templates") === "1") {
      return NextResponse.json({ templates: SPEC_TEMPLATES });
    }

    const specs = await getSpecsForPair(pairId);
    return NextResponse.json({ specs });
  } catch (error) {
    console.error("[API] task-specs GET:", error);
    return NextResponse.json({ error: "Failed to get task specs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // ── Activate ──
    if (action === "activate") {
      const specId = body.specId as string;
      if (!specId) return NextResponse.json({ error: "Missing specId" }, { status: 400 });
      const spec = await activateSpec(specId);
      if (!spec) return NextResponse.json({ error: "Spec not found or not in draft" }, { status: 404 });
      return NextResponse.json({ spec });
    }

    // ── Complete ──
    if (action === "complete") {
      const specId = body.specId as string;
      const status = body.status as "success" | "failure" | "timeout" | "cancelled";
      const summary = (body.summary as string) ?? "Completed";
      if (!specId) return NextResponse.json({ error: "Missing specId" }, { status: 400 });
      const spec = await completeSpec(specId, { status, summary });
      if (!spec) return NextResponse.json({ error: "Spec not found" }, { status: 404 });
      return NextResponse.json({ spec });
    }

    // ── Update constraints ──
    if (action === "update") {
      const specId = body.specId as string;
      const constraints = body.constraints;
      if (!specId || !constraints) return NextResponse.json({ error: "Missing specId or constraints" }, { status: 400 });
      const spec = await updateSpecConstraints(specId, constraints);
      if (!spec) return NextResponse.json({ error: "Spec not found or not in draft" }, { status: 404 });
      return NextResponse.json({ spec });
    }

    // ── Create ──
    const pairId = (body.pairId as string) ?? await getActivePairId();
    const objective = body.objective as string;
    if (!objective) return NextResponse.json({ error: "Missing objective" }, { status: 400 });

    const spec = await createTaskSpec(pairId, objective, {
      template: body.template,
      description: body.description,
      constraints: body.constraints,
      permissions: body.permissions,
      successCriteria: body.successCriteria,
      failureCriteria: body.failureCriteria,
      timeLimitMinutes: body.timeLimitMinutes,
      customRules: body.customRules,
    });

    return NextResponse.json({ spec }, { status: 201 });
  } catch (error) {
    console.error("[API] task-specs POST:", error);
    return NextResponse.json({ error: "Failed to handle task spec" }, { status: 500 });
  }
}
