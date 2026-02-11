"use client";

interface SourceTagProps {
  type: string;
  name: string;
}

const TAG_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  github_repo: { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400", icon: "\u2302" },
  rss_feed: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "\u25C9" },
  moltbook_topic: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-300", icon: "\u25C8" },
  news: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "\u25CE" },
  custom: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-400", icon: "\u25A1" },
};

export function SourceTag({ type, name }: SourceTagProps) {
  const style = TAG_STYLES[type] || TAG_STYLES.custom;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${style.bg} ${style.border} ${style.text}`}
    >
      {style.icon} {name}
    </span>
  );
}
