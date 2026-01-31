"use client";

import Link from "next/link";
import { IdleBanner } from "@/components/IdleBanner";
import { AgentActivityBlock } from "@/components/AgentActivityBlock";
import { useProjects } from "@/hooks/useProjects";

export default function ContextHubPage() {
  const { projects, loading } = useProjects();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Context Hub — your projects
        </h2>
        <p className="mt-1 text-zinc-400">
          Start with your problem space. Each project = problem space + linked repos, feeds, agents + decision log.
        </p>
      </section>

      <AgentActivityBlock />

      {loading ? (
        <p className="text-sm text-zinc-500 py-8">Loading projects…</p>
      ) : (
        <ul className="space-y-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-white">{project.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                      {project.problemSpaceMarkdown.slice(0, 120) || "No problem space defined."}
                      {project.problemSpaceMarkdown.length > 120 ? "…" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>{project.linkedRepos.length} repos</span>
                      <span>{project.linkedFeeds.length} feeds</span>
                      <span>{project.linkedAgents.length} agents</span>
                      <span>{project.decisionLog.length} decisions</span>
                    </div>
                  </div>
                  <IdleBanner lastActivityAt={project.lastActivityAt} compact />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/projects/new"
        className="mt-8 block rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center transition hover:border-zinc-600 hover:bg-zinc-900/50"
      >
        <p className="text-sm text-zinc-500">+ New project</p>
        <p className="mt-1 text-xs text-zinc-600">Define a problem space and link repos, feeds, agents.</p>
      </Link>
    </main>
  );
}
