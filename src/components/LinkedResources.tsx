"use client";

import type { LinkedRepo, LinkedFeed, LinkedAgent } from "@/types/project";
import { formatDistanceToNow } from "date-fns";

type Props = {
  repos: LinkedRepo[];
  feeds: LinkedFeed[];
  agents: LinkedAgent[];
};

function RepoRow({ r }: { r: LinkedRepo }) {
  return (
    <li className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div>
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:underline">
          {r.name}
        </a>
        {r.branch && <span className="ml-2 text-xs text-zinc-500">{r.branch}</span>}
      </div>
      {r.lastSyncedAt && (
        <span className="text-xs text-zinc-500">
          Synced {formatDistanceToNow(new Date(r.lastSyncedAt), { addSuffix: true })}
        </span>
      )}
    </li>
  );
}

function FeedRow({ f }: { f: LinkedFeed }) {
  return (
    <li className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div>
        <span className="font-medium text-white">{f.name}</span>
        <span className="ml-2 text-xs text-zinc-500">{f.type}</span>
      </div>
      {f.lastFetchedAt && (
        <span className="text-xs text-zinc-500">
          Fetched {formatDistanceToNow(new Date(f.lastFetchedAt), { addSuffix: true })}
        </span>
      )}
    </li>
  );
}

function AgentRow({ a }: { a: LinkedAgent }) {
  return (
    <li className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div>
        <span className="font-medium text-white">{a.name}</span>
        <span className="ml-2 text-xs text-zinc-500">{a.role}</span>
      </div>
      {a.lastActiveAt && (
        <span className="text-xs text-zinc-500">
          Active {formatDistanceToNow(new Date(a.lastActiveAt), { addSuffix: true })}
        </span>
      )}
    </li>
  );
}

export function LinkedResources({ repos, feeds, agents }: Props) {
  return (
    <>
      <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        Linked resources
      </h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-3">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase text-zinc-600">Repos</h3>
          <ul className="space-y-2">
            {repos.length ? repos.map((r) => <RepoRow key={r.id} r={r} />) : <li className="text-sm text-zinc-500">None linked</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase text-zinc-600">Feeds</h3>
          <ul className="space-y-2">
            {feeds.length ? feeds.map((f) => <FeedRow key={f.id} f={f} />) : <li className="text-sm text-zinc-500">None linked</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase text-zinc-600">Agents</h3>
          <ul className="space-y-2">
            {agents.length ? agents.map((a) => <AgentRow key={a.id} a={a} />) : <li className="text-sm text-zinc-500">None linked</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
