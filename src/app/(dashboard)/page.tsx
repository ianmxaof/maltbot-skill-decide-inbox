"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { IdleBanner } from "@/components/IdleBanner";
import { AgentActivityBlock } from "@/components/AgentActivityBlock";
import { TimelineSection, RadarSection } from "@/components/context-hub";
import { useProjects } from "@/hooks/useProjects";
import { FolderOpen, Clock, Radio } from "lucide-react";

const SUB_TABS = [
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "radar", label: "Radar", icon: Radio },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];
const VALID_TAB_IDS = new Set(SUB_TABS.map((t) => t.id));

function ContextHubContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SubTabId>("projects");

  useEffect(() => {
    if (tabFromUrl && VALID_TAB_IDS.has(tabFromUrl as SubTabId)) {
      setActiveTab(tabFromUrl as SubTabId);
    }
  }, [tabFromUrl]);

  const { projects, loading } = useProjects();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Context Hub
        </h2>
        <p className="mt-1 text-zinc-400">
          {activeTab === "projects" && "Start with your problem space. Each project = problem space + linked repos, feeds, agents + decision log."}
          {activeTab === "timeline" && "Timeline of agent cognition: observed → hypothesis → cross-check → proposal → awaiting decision."}
          {activeTab === "radar" && "Radar view: CI failures upstream, dependency churn, tooling changes, new automation opportunities."}
        </p>
      </section>

      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm transition-all ${
              activeTab === tab.id
                ? "bg-zinc-800/80 text-white border-t border-x border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "projects" && (
        <>
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
        </>
      )}

      {activeTab === "timeline" && <TimelineSection />}
      {activeTab === "radar" && <RadarSection />}
    </main>
  );
}

export default function ContextHubPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-6 py-8"><p className="text-zinc-500">Loading…</p></main>}>
      <ContextHubContent />
    </Suspense>
  );
}
