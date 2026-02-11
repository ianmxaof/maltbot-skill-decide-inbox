"use client";

import Link from "next/link";
import { Plus, Settings, User } from "lucide-react";

interface QuickActionsBarProps {
  pairId?: string;
}

export function QuickActionsBar({ pairId }: QuickActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/projects/new"
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/50"
      >
        <Plus className="w-4 h-4" />
        New Project
      </Link>
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/50"
      >
        <Settings className="w-4 h-4" />
        Configure Agent
      </Link>
      {pairId && (
        <Link
          href={`/pair/${pairId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/50"
        >
          <User className="w-4 h-4" />
          View Public Profile
        </Link>
      )}
    </div>
  );
}
