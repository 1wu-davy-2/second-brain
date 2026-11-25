"use client";

import { Check, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { createTag } from "@/lib/notes/actions";
import { cn } from "@/lib/utils";

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export function TagPicker({
  selected,
  allTags,
  onChange,
}: {
  selected: TagOption[];
  allTags: TagOption[];
  onChange: (tagIds: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open]);

  const selectedIds = new Set(selected.map((tag) => tag.id));
  const filtered = allTags.filter((tag) =>
    query.trim() ? tag.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );
  const canCreate = query.trim().length > 0 && !allTags.some((tag) => tag.name === query.trim());

  const toggle = (tagId: string) => {
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    onChange([...next]);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    const result = await createTag(name);
    setCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChange([...selectedIds, result.data.id]);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <span
          key={tag.id}
          className="group inline-flex h-[21px] items-center gap-1.5 rounded-[4px] border border-border bg-muted/60 pl-2 pr-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <span
            className="size-[5px] rounded-full"
            style={{ backgroundColor: tag.color ?? "oklch(0.72 0.03 255)" }}
          />
          {tag.name}
          <button
            type="button"
            aria-label={`移除标签 ${tag.name}`}
            onClick={() => toggle(tag.id)}
            className="rounded-full p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-[21px] items-center gap-1 rounded-[4px] border border-dashed border-border px-2 text-[10.5px] font-medium text-muted-foreground/80 transition-colors hover:border-solid hover:bg-accent hover:text-foreground",
          open && "border-solid bg-accent text-foreground",
        )}
      >
        <Plus className="size-2.5" />
        标签
      </button>

      {open ? (
        <div className="animate-in-fast absolute left-0 top-[calc(100%+6px)] z-40 w-[248px] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover shadow-paper">
          <div className="border-b border-border p-1.5">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (canCreate) void handleCreate();
                  else if (filtered.length === 1) toggle(filtered[0].id);
                }
              }}
              placeholder="搜索或新建标签…"
              className="h-7 border-0 bg-muted/50 text-[12px] focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 && !canCreate ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">没有标签</p>
            ) : null}

            {filtered.map((tag) => {
              const active = selectedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-[4px] px-2 py-[6px] text-left text-[12.5px] transition-colors duration-150 hover:bg-accent"
                >
                  <span
                    className="size-[6px] shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color ?? "oklch(0.72 0.03 255)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  {active ? <Check className="size-3 shrink-0 text-signal" /> : null}
                </button>
              );
            })}

            {canCreate ? (
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-[4px] px-2 py-[6px] text-left text-[12.5px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  新建标签「{query.trim()}」
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
