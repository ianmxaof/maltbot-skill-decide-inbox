"use client";

import { ExternalLink } from "lucide-react";

/**
 * Placeholder for PowerCore import — "Coming soon" for MVP.
 * Future: OAuth or deep link to PowerCore.
 */
export function PowerCoreImportCard() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-300">Import from PowerCore</p>
          <p className="mt-1 text-sm text-zinc-500">
            Deploy an agent from PowerCore. Coming soon.
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-500/60 border border-zinc-700 bg-zinc-800/50 opacity-60 cursor-not-allowed"
          aria-disabled
        >
          <ExternalLink className="w-3 h-3" />
          PowerCore
        </a>
      </div>
    </div>
  );
}
