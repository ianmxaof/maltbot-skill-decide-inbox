"use client";

import { FileText } from "lucide-react";
import type { ProfileWidget } from "@/types/social";

interface Props {
  widget: ProfileWidget;
  accentColor: string;
}

export function CustomMarkdownWidget({ widget, accentColor }: Props) {
  const content = (widget.config?.content as string) ?? "";

  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-zinc-600 gap-1">
        <FileText className="w-5 h-5 text-zinc-700" />
        Empty custom block
      </div>
    );
  }

  // Simple markdown-ish rendering (no heavy library needed for profile blocks)
  const lines = content.split("\n");

  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return <h3 key={i} className="text-sm font-bold text-white mt-0 mb-1">{line.slice(2)}</h3>;
        }
        if (line.startsWith("## ")) {
          return <h4 key={i} className="text-xs font-semibold text-zinc-300 mt-0 mb-1">{line.slice(3)}</h4>;
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-zinc-600 mt-0.5">•</span>
              <span className="text-xs text-zinc-400 leading-relaxed">{line.slice(2)}</span>
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return <p key={i} className="text-xs text-zinc-400 leading-relaxed m-0">{line}</p>;
      })}
    </div>
  );
}
