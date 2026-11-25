"use client";

import { ArrowUpRight, CornerDownRight, ListTree } from "lucide-react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface PanelLink {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function NoteSidePanel({
  headings,
  backlinks,
  outgoing,
  onJumpToHeading,
}: {
  headings: Heading[];
  backlinks: PanelLink[];
  outgoing: PanelLink[];
  onJumpToHeading: (heading: Heading) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Section title="大纲" count={headings.length} icon={ListTree}>
        {headings.length === 0 ? (
          <Hint>用 ## 标记小标题，大纲会出现在这里</Hint>
        ) : (
          headings.map((heading) => (
            <button
              key={heading.id}
              type="button"
              onClick={() => onJumpToHeading(heading)}
              className={cn(
                "block w-full truncate rounded-[6px] py-[3px] pr-2 text-left font-reading text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                heading.level === 1 && "font-semibold text-foreground",
                heading.level === 2 && "pl-2",
                heading.level === 3 && "pl-5",
                heading.level === 4 && "pl-7",
              )}
              style={{ paddingLeft: 8 + (heading.level - 1) * 10 }}
            >
              {heading.text}
            </button>
          ))
        )}
      </Section>

      <Section title="反向链接" count={backlinks.length} icon={CornerDownRight}>
        {backlinks.length === 0 ? (
          <Hint>还没有笔记引用这一篇。在别处输入 [[{headings[0]?.text ?? "标题"}]] 即可关联</Hint>
        ) : (
          backlinks.map((link) => <LinkRow key={link.id} link={link} />)
        )}
      </Section>

      <Section title="链接出去" count={outgoing.length} icon={ArrowUpRight}>
        {outgoing.length === 0 ? (
          <Hint>输入 [[ 引用其他笔记，链接会出现在这里</Hint>
        ) : (
          outgoing.map((link) => <LinkRow key={link.id} link={link} />)
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: typeof ListTree;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-3 py-3 last:border-b-0">
      <header className="mb-1.5 flex items-center gap-1.5 px-1">
        <Icon className="size-3 text-muted-foreground/50" />
        <h3 className="paper-label">{title}</h3>
        {count > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/50">{count}</span>
        ) : null}
      </header>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function LinkRow({ link }: { link: PanelLink }) {
  return (
    <Link
      href={`/notes/${link.id}`}
      className="block rounded-[6px] px-1.5 py-1.5 transition-colors hover:bg-accent"
    >
      <p className="truncate font-reading text-[13px] font-medium leading-snug">{link.title}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.5] text-muted-foreground">
        {link.excerpt || "空笔记"}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground/60">
        {formatRelativeTime(link.updatedAt)}
      </p>
    </Link>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1.5 py-1 text-[11px] leading-relaxed text-muted-foreground/60">{children}</p>
  );
}
