import { Suspense } from "react";
import CommandCenter from "@/components/command-center/CommandCenter";

export default function CommandCenterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500">Loading…</div>}>
      <CommandCenter />
    </Suspense>
  );
}
