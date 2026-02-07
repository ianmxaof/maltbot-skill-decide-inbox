"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Skills moved to Command Center → Installed Skills sub-tab. Redirect for backwards compatibility. */
export default function SkillsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/command-center?tab=installed_skills");
  }, [router]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-sm text-zinc-500">Redirecting to Command Center → Installed Skills…</p>
    </main>
  );
}
