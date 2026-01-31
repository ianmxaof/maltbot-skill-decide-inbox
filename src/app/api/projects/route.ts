/**
 * GET /api/projects — List projects
 * POST /api/projects — Create project (body: Project sans id)
 */

import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/project-store";
import type { Project } from "@/types/project";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list projects";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Project>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const project = await createProject({
      name,
      problemSpaceMarkdown: typeof body.problemSpaceMarkdown === "string" ? body.problemSpaceMarkdown : "",
      primaryAgentId: typeof body.primaryAgentId === "string" ? body.primaryAgentId : undefined,
      linkedRepos: Array.isArray(body.linkedRepos) ? body.linkedRepos : [],
      linkedFeeds: Array.isArray(body.linkedFeeds) ? body.linkedFeeds : [],
      linkedAgents: Array.isArray(body.linkedAgents) ? body.linkedAgents : [],
      decisionLog: Array.isArray(body.decisionLog) ? body.decisionLog : [],
    });
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        problemSpaceMarkdown: project.problemSpaceMarkdown,
        primaryAgentId: project.primaryAgentId,
        linkedRepos: project.linkedRepos,
        linkedFeeds: project.linkedFeeds,
        linkedAgents: project.linkedAgents,
        decisionLog: project.decisionLog,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        lastActivityAt: project.lastActivityAt,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
