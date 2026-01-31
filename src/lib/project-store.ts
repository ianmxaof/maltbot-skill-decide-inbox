/**
 * Project store — user-created projects for Context Hub.
 * Persists to .data/projects.json (gitignored).
 *
 * Mirrors pattern from agent-roster.ts.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Project, LinkedRepo, LinkedFeed, LinkedAgent } from "@/types/project";

type ProjectsFile = {
  projects: Project[];
  version: number;
};

const PROJECTS_PATH = path.join(process.cwd(), ".data", "projects.json");
const STORE_VERSION = 1;

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(PROJECTS_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readProjectsFile(): Promise<ProjectsFile> {
  try {
    const raw = await readFile(PROJECTS_PATH, "utf-8");
    const data = JSON.parse(raw) as ProjectsFile;
    return data?.projects ? data : { projects: [], version: STORE_VERSION };
  } catch {
    return { projects: [], version: STORE_VERSION };
  }
}

async function writeProjectsFile(data: ProjectsFile): Promise<void> {
  await ensureDataDir();
  await writeFile(PROJECTS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function nextId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function listProjects(): Promise<Project[]> {
  const { projects } = await readProjectsFile();
  return projects;
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await listProjects();
  return projects.find((p) => p.id === id) ?? null;
}

export type CreateProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: input.id ?? nextId(),
    name: input.name.trim(),
    problemSpaceMarkdown: input.problemSpaceMarkdown ?? "",
    primaryAgentId: input.primaryAgentId,
    linkedRepos: input.linkedRepos ?? [],
    linkedFeeds: input.linkedFeeds ?? [],
    linkedAgents: input.linkedAgents ?? [],
    decisionLog: input.decisionLog ?? [],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: input.lastActivityAt,
  };
  const file = await readProjectsFile();
  file.projects.push(project);
  file.version = STORE_VERSION;
  await writeProjectsFile(file);
  return project;
}

export type UpdateProjectInput = Partial<Omit<Project, "id" | "createdAt">>;

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const file = await readProjectsFile();
  const idx = file.projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const existing = file.projects[idx];
  const updated: Project = {
    ...existing,
    ...input,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  file.projects[idx] = updated;
  file.version = STORE_VERSION;
  await writeProjectsFile(file);
  return updated;
}

export async function removeProject(id: string): Promise<boolean> {
  const file = await readProjectsFile();
  const idx = file.projects.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  file.projects.splice(idx, 1);
  file.version = STORE_VERSION;
  await writeProjectsFile(file);
  return true;
}
