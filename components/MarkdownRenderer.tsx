"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <article className={cn("prose prose-slate max-w-none prose-headings:font-semibold prose-table:text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </article>
  );
}
