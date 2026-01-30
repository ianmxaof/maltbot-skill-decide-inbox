"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { markdown: string };

/**
 * Markdown + diagrams for problem definition.
 * Mermaid blocks can be rendered client-side with a mermaid library later.
 */
export function ProblemSpace({ markdown }: Props) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-zinc-900 prose-pre:text-zinc-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
