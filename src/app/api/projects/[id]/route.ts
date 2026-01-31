/**
 * GET /api/projects/[id] — Get project
 * PATCH /api/projects/[id] — Update project
 * DELETE /api/projects/[id] — Remove project
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, removeProject } from "@/lib/project-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const project = await updateProject(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      problemSpaceMarkdown: typeof body.problemSpaceMarkdown === "string" ? body.problemSpaceMarkdown : undefined,
      primaryAgentId: typeof body.primaryAgentId === "string" ? body.primaryAgentId : undefined,
      linkedRepos: Array.isArray(body.linkedRepos) ? body.linkedRepos : undefined,
      linkedFeeds: Array.isArray(body.linkedFeeds) ? body.linkedFeeds : undefined,
      linkedAgents: Array.isArray(body.linkedAgents) ? body.linkedAgents : undefined,
      decisionLog: Array.isArray(body.decisionLog) ? body.decisionLog : undefined,
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await removeProject(id);
    if (!ok) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
