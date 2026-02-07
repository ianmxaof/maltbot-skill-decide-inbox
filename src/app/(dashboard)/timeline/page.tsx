"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Agent Timeline moved to Context Hub → Timeline sub-tab. Redirect for backwards compatibility. */
export default function TimelineRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?tab=timeline");
  }, [router]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-sm text-zinc-500">Redirecting to Context Hub → Timeline…</p>
    </main>
  );
}
