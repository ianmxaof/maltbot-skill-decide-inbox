"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { usePair } from "@/hooks/usePair";

export function DashboardHeaderAuth() {
  const { data: session, status } = useSession();
  const { activePairId } = usePair();

  if (status === "loading") {
    return (
      <span className="text-xs text-zinc-500">Loading…</span>
    );
  }

  if (!session?.user) {
    return null;
  }

  const name = session.user.name ?? session.user.email ?? "Signed in";
  const img = session.user.image;

  return (
    <div className="flex items-center gap-2">
      <NotificationBell pairId={activePairId} />
      <span className="flex items-center gap-1.5 text-xs text-zinc-400 max-w-[180px] truncate" title={session.user.email ?? undefined}>
        {img ? (
          <img src={img} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <User className="w-4 h-4 text-zinc-500" />
        )}
        <span className="truncate">{name}</span>
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="p-2 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
