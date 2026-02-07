"use client";

import { useState, useEffect } from "react";
import {
  getRefreshIntervalSec,
  setRefreshIntervalSec,
  REFRESH_OPTIONS,
  REFRESH_INTERVAL_CHANGED,
} from "@/lib/refresh-interval";

export function RefreshIntervalPanel() {
  const [intervalSec, setIntervalSec] = useState(30);

  useEffect(() => {
    setIntervalSec(getRefreshIntervalSec());
    const handler = () => setIntervalSec(getRefreshIntervalSec());
    window.addEventListener(REFRESH_INTERVAL_CHANGED, handler);
    return () => window.removeEventListener(REFRESH_INTERVAL_CHANGED, handler);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        How often feed views (Moltbook Feed, Decide Inbox, etc.) auto-refresh. Use &quot;Freeze&quot; on a feed to stop its refresh without changing this.
      </p>
      <select
        value={intervalSec}
        onChange={(e) => {
          const v = Number(e.target.value);
          setRefreshIntervalSec(v);
          setIntervalSec(v);
        }}
        className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        {REFRESH_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
