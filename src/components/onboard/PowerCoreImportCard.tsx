"use client";

import { ExternalLink } from "lucide-react";

/**
 * Placeholder for PowerCore import — "Coming soon" for MVP.
 * Future: OAuth or deep link to PowerCore.
 */
export function PowerCoreImportCard() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-600 bg-zinc-900/30 p-4">
      <p className="text-sm font-medium text-zinc-400">Import from PowerCore</p>
      <p className="mt-1 text-xs text-zinc-500">
        Deploy an agent from PowerCore. Coming soon.
      </p>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="mt-2 inline-flex items-center gap-1 text-xs text-amber-500/80 opacity-60 cursor-not-allowed"
        aria-disabled
      >
        <ExternalLink className="w-3 h-3" />
        PowerCore
      </a>
    </div>
  );
}
