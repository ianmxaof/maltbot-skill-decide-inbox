import { Suspense } from "react";
import { MoltbookHub } from "@/components/moltbook";

export default function MoltbookPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6 text-zinc-500">Loading…</div>}>
        <MoltbookHub />
      </Suspense>
    </main>
  );
}
