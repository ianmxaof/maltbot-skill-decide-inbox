"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Check, X, Code2, Package, FileCode, Trash2, GitBranch, Globe, Lock } from "lucide-react";
import type { DevAction } from "@/types/dashboard";

const riskColors: Record<DevAction["riskLevel"], string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-rose-500/20 text-rose-400",
};

const actionTypeIcons: Record<DevAction["actionType"], typeof Code2> = {
  add_dependency: Package,
  create_file: FileCode,
  modify_file: FileCode,
  delete_file: Trash2,
  architecture_change: GitBranch,
  external_api: Globe,
  auth_or_payment: Lock,
};

export function DevActionCard({
  item,
  onAct,
  isExecuting,
}: {
  item: DevAction;
  onAct: (id: string, action: "ignore" | "approve" | "deeper") => void;
  isExecuting?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const Icon = actionTypeIcons[item.actionType];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: "ignore" | "approve" | "deeper") => {
      if (e.key === "Enter" && action === "approve") {
        e.preventDefault();
        onAct(item.id, "approve");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setFocused(false);
      }
    },
    [item.id, onAct]
  );

  return (
    <li
      className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        <span className="rounded px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400">
          Dev · {item.actionType.replace(/_/g, " ")}
        </span>
        <span className="text-zinc-600">proj: {item.projectId}</span>
        {format(new Date(item.createdAt), "MMM d, HH:mm")}
        <span className={`rounded px-1.5 py-0.5 ${riskColors[item.riskLevel]}`}>{item.riskLevel}</span>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-zinc-800 shrink-0">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{item.title}</h3>
          <p className="text-sm text-zinc-400 mt-1">{item.description}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-800/50 rounded-lg mb-4">
        <h4 className="text-xs font-semibold text-zinc-500 mb-2">AGENT&apos;S REASONING</h4>
        <p className="text-sm text-zinc-300 italic">&quot;{item.reasoning}&quot;</p>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-zinc-500 mb-2">IMPLICATIONS</h4>
        <ul className="space-y-1">
          {item.implications.map((imp, i) => (
            <li key={i} className="text-sm text-zinc-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              {imp}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => onAct(item.id, "approve")}
          onKeyDown={(e) => handleKeyDown(e, "approve")}
          aria-label="Approve"
          disabled={isExecuting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {isExecuting ? "Executing…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => onAct(item.id, "ignore")}
          aria-label="Ignore"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Modify
        </button>
        <button
          type="button"
          onClick={() => onAct(item.id, "ignore")}
          aria-label="Deny"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Deny
        </button>
        <button
          type="button"
          onClick={() => onAct(item.id, "deeper")}
          className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Ask Why
        </button>
      </div>
    </li>
  );
}
