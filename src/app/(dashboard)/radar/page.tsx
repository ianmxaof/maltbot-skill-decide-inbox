"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** CI/CR Radar moved to Context Hub → Radar sub-tab. Redirect for backwards compatibility. */
export default function RadarRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?tab=radar");
  }, [router]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-sm text-zinc-500">Redirecting to Context Hub → Radar…</p>
    </main>
  );
}
