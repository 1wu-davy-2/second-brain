"use client";

import {
  CornerDownLeft,
  FilePlus2,
  FileText,
  Globe,
  Hash,
  Search,
  Settings,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Kbd } from "@/components/ui/kbd";
import { cn, formatRelativeTime } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recent: { id: string; title: string }[];
  onCreate: () => void;
}

interface SearchHit {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
}

interface Entry {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export function CommandPalette({ open, onOpenChange, recent, onCreate }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { items: SearchHit[] };
        setHits(data.items ?? []);
      } catch {
        /* 取消或网络抖动，忽略 */
      } finally {
        setLoading(false);
      }
    }, 140);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const go = React.useCallback(
    (path: string) => {
      onOpenChange(false);
      router.push(path);
    },
    [onOpenChange, router],
  );

  const groups = React.useMemo(() => {
    const term = query.trim();
    if (!term) {
      const quick: Entry[] = [
        {
          key: "new",
          label: "新建笔记",
          hint: "⌘N",
          icon: FilePlus2,
          onSelect: () => {
            onOpenChange(false);
            onCreate();
          },
        },
        { key: "all", label: "全部笔记", icon: FileText, onSelect: () => go("/notes") },
        { key: "fav", label: "收藏", icon: Star, onSelect: () => go("/favorites") },
        { key: "shared", label: "已分享", icon: Globe, onSelect: () => go("/shared") },
        { key: "settings", label: "设置", icon: Settings, onSelect: () => go("/settings") },
      ];
      const recentEntries: Entry[] = recent.map((note) => ({
        key: `recent-${note.id}`,
        label: note.title,
        icon: FileText,
        onSelect: () => go(`/notes/${note.id}`),
      }));
      return [
        { label: "快捷操作", entries: quick },
        ...(recentEntries.length > 0 ? [{ label: "最近编辑", entries: recentEntries }] : []),
      ];
    }

    const noteEntries: Entry[] = hits.map((hit) => ({
      key: `hit-${hit.id}`,
      label: hit.title,
      hint: formatRelativeTime(hit.updatedAt),
      icon: FileText,
      onSelect: () => go(`/notes/${hit.id}`),
    }));

    const createEntry: Entry = {
      key: "create-with-title",
      label: `新建「${term}」`,
      icon: FilePlus2,
      onSelect: () => go(`/notes/new?title=${encodeURIComponent(term)}`),
    };

    const groups: { label: string; entries: Entry[] }[] = [];
    if (noteEntries.length > 0) groups.push({ label: `笔记 · ${noteEntries.length}`, entries: noteEntries });
    groups.push({ label: "操作", entries: [createEntry] });
    return groups;
  }, [query, hits, recent, go, onCreate, onOpenChange]);

  const flat = React.useMemo(() => groups.flatMap((group) => group.entries), [groups]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, hits.length]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
      }
      if (event.key === "Enter") {
        const entry = flat[activeIndex];
        if (entry) {
          event.preventDefault();
          entry.onSelect();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, flat, activeIndex, onOpenChange]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-foreground/25"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div className="animate-in-fast relative w-full max-w-[560px] overflow-hidden rounded-lg border border-border bg-popover shadow-paper">
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索笔记、标签，或输入命令…"
            className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
            spellCheck={false}
          />
          {loading ? (
            <span className="size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-muted-foreground/30 border-t-muted-foreground" />
          ) : (
            <Kbd>Esc</Kbd>
          )}
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {query.trim() && hits.length === 0 && !loading ? (
            <p className="px-3 pb-1 pt-3 text-[11.5px] text-muted-foreground/80">
              没有匹配的笔记，可以直接新建
            </p>
          ) : null}
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              没有匹配的笔记
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="paper-label px-2.5 pb-1 pt-2">
                  {group.label}
                </div>
                {group.entries.map((entry) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={entry.onSelect}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] transition-colors",
                        active
                          ? "bg-accent text-foreground shadow-[inset_2px_0_0_var(--signal)]"
                          : "text-foreground/85",
                      )}
                    >
                      <entry.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                      {entry.hint ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{entry.hint}</span>
                      ) : null}
                      {active ? (
                        <CornerDownLeft className="size-3 shrink-0 text-muted-foreground/60" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-muted/50 px-3.5 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> 选择
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> 打开
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Hash className="size-3" /> 支持标题与正文
          </span>
        </div>
      </div>
    </div>
  );
}
