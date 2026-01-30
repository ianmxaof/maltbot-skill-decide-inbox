"use client";

/**
 * "Signal drift detected" — placeholder for future drift detection.
 * Renders a warning when we (will) detect that linked repos/feeds/context
 * have drifted from the problem space or each other.
 */
type Props = { projectId: string };

export function SignalDriftBanner({ projectId }: Props) {
  // TODO: wire to real drift detection (e.g. compare repo changes vs problem space)
  const hasDrift = false;
  if (!hasDrift) return null;

  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
      <p className="text-sm font-medium text-rose-200">Signal drift detected</p>
      <p className="mt-1 text-xs text-rose-200/80">
        Linked context has diverged from this project&apos;s problem space. Review repos and feeds.
      </p>
    </div>
  );
}
