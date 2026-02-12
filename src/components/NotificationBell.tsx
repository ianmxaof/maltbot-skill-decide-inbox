"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Inbox,
  Globe,
  Sparkles,
  Trophy,
  Mail,
} from "lucide-react";
import type { PlatformNotification, NotificationType } from "@/types/disclosure";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "agent_discovery":
      return <Inbox className="w-4 h-4 text-amber-400" />;
    case "network_convergence":
      return <Globe className="w-4 h-4 text-blue-400" />;
    case "feature_unlock":
      return <Sparkles className="w-4 h-4 text-violet-400" />;
    case "milestone":
      return <Trophy className="w-4 h-4 text-emerald-400" />;
    case "weekly_digest":
      return <Mail className="w-4 h-4 text-zinc-400" />;
    default:
      return <Bell className="w-4 h-4 text-zinc-400" />;
  }
}

export function NotificationBell({ pairId }: { pairId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!pairId) return;
    try {
      const res = await fetch(
        `/api/notifications?pairId=${encodeURIComponent(pairId)}&unreadOnly=true`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // silent
    }
  }, [pairId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    if (!pairId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead", pairId }),
    }).catch((e) => console.error("[NotificationBell] markAllRead failed:", e));
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClickNotification = (n: PlatformNotification) => {
    if (n.route) {
      router.push(n.route);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500">
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
