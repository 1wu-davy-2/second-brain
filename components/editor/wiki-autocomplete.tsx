"use client";

import { CornerDownLeft, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteRef } from "@/lib/markdown/wiki-links";
import type { CaretRect } from "@/lib/dom/caret";

export function WikiAutocomplete({
  query,
  items,
  activeIndex,
  position,
  onPick,
  onInsertNew,
  onHover,
}: {
  query: string;
  items: NoteRef[];
  activeIndex: number;
  position: CaretRect | null;
  onPick: (item: NoteRef) => void;
  onInsertNew: () => void;
  onHover: (index: number) => void;
}) {
  if (!position) return null;

  const hasExact = items.some((item) => item.title.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !hasExact;

  return (
    <div
      style={{ position: "fixed", top: position.top, left: position.left, width: 264 }}
      className="animate-in-fast z-50 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover shadow-paper"
    >
      <div className="paper-label border-b border-border px-2.5 py-1.5">
        链接到笔记
      </div>
      <div className="max-h-[228px] overflow-y-auto p-1">
        {items.length === 0 && !showCreate ? (
          <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">没有匹配的笔记</p>
        ) : null}

        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onMouseMove={() => onHover(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-[4px] border-l-2 py-[6px] pl-1.5 pr-2 text-left font-sans text-[12.5px] transition-colors duration-150",
              index === activeIndex
                ? "border-signal bg-accent text-foreground"
                : "border-transparent text-foreground/85",
            )}
          >
            <FileText className="size-3 shrink-0 text-muted-foreground/70" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {index === activeIndex ? (
              <CornerDownLeft className="size-2.5 shrink-0 text-muted-foreground/60" />
            ) : null}
          </button>
        ))}

        {showCreate ? (
          <button
            type="button"
            onMouseMove={() => onHover(items.length)}
            onMouseDown={(event) => {
              event.preventDefault();
              onInsertNew();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-[4px] border-l-2 py-[6px] pl-1.5 pr-2 text-left font-sans text-[12.5px] transition-colors duration-150",
              activeIndex === items.length
                ? "border-signal bg-accent text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            <Plus className="size-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              插入 <span className="font-medium text-foreground">[[{query.trim()}]]</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">新链接</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
