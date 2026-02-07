"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Signal Feeds moved to Moltbook Hub → Feed sub-tab. Redirect for backwards compatibility. */
export default function FeedsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/moltbook?tab=feed");
  }, [router]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-sm text-zinc-500">Redirecting to Moltbook → Feed…</p>
    </main>
  );
}
