import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveWikiLinks, type NoteRef } from "@/lib/markdown/wiki-links";
import { cn } from "@/lib/utils";

const components: Components = {
  a({ href, children, title }) {
    const isInternal = href?.startsWith("/");
    const isWiki = title === "wiki-link";
    const isMissing = title === "wiki-link-missing";

    if (isInternal && href) {
      return (
        <Link
          href={href}
          className={cn(
            isWiki && "rounded-sm bg-link-bg/60 px-0.5 no-underline hover:bg-link-bg",
            isMissing && "border-b border-dashed border-muted-foreground/50 text-muted-foreground",
          )}
        >
          {children}
        </Link>
      );
    }

    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  },
};

export function MarkdownPreview({
  content,
  refs = [],
  wikiFallback = "create",
  className,
}: {
  content: string;
  refs?: NoteRef[];
  wikiFallback?: "create" | "text";
  className?: string;
}) {
  const resolved = resolveWikiLinks(content, refs, wikiFallback);

  return (
    <div className={cn("prose-note", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {resolved}
      </ReactMarkdown>
    </div>
  );
}
