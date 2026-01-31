import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject } from "@/lib/project-store";
import { IdleBanner } from "@/components/IdleBanner";
import { SignalDriftBanner } from "@/components/SignalDriftBanner";
import { ProblemSpace } from "@/components/ProblemSpace";
import { LinkedResources } from "@/components/LinkedResources";
import { DecisionLog } from "@/components/DecisionLog";
import { WhatChangedBanner } from "@/components/WhatChangedBanner";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Context Hub
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-white">{project.name}</h1>
      <p className="mt-1 text-sm text-zinc-400">Problem space · Repos · Feeds · Agents · Decision log</p>

      <div className="mt-8 space-y-6">
        <IdleBanner lastActivityAt={project.lastActivityAt} />
        <SignalDriftBanner projectId={project.id} />
        <WhatChangedBanner projectId={project.id} lastActivityAt={project.lastActivityAt} />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Problem space
        </h2>
        <ProblemSpace markdown={project.problemSpaceMarkdown} />
      </section>

      <section className="mt-10">
        <LinkedResources
          repos={project.linkedRepos}
          feeds={project.linkedFeeds}
          agents={project.linkedAgents}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Decision log
        </h2>
        <DecisionLog entries={project.decisionLog} />
      </section>
    </main>
  );
}
