"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Globe,
  Link2,
  Loader2,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { EditorToolbar, type EditorMode, type ToolbarCommand } from "@/components/editor/editor-toolbar";
import { NoteSidePanel, type Heading, type PanelLink } from "@/components/editor/note-side-panel";
import { TagPicker } from "@/components/editor/tag-picker";
import { WikiAutocomplete } from "@/components/editor/wiki-autocomplete";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { getCaretRect, type CaretRect } from "@/lib/dom/caret";
import { deleteNote, setNotePublic, setNoteTags, toggleFavorite, updateNote } from "@/lib/notes/actions";
import { extractHeadings, type NoteRef } from "@/lib/markdown/wiki-links";
import { cn, countWords, formatRelativeTime } from "@/lib/utils";

interface EditorNote {
  id: string;
  title: string;
  content: string;
  isFavorite: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  wordCount: number;
  updatedAt: string;
}

type SaveStatus = "saved" | "editing" | "saving" | "error";

const EMPTY_TITLE = "无标题";

export function NoteEditor({
  note,
  noteTags,
  allTags,
  backlinks,
  outgoing,
  refs,
}: {
  note: EditorNote;
  noteTags: { id: string; name: string; color: string | null }[];
  allTags: { id: string; name: string; color: string | null }[];
  backlinks: PanelLink[];
  outgoing: PanelLink[];
  refs: NoteRef[];
}) {
  const router = useRouter();

  const initialTitle = note.title === EMPTY_TITLE ? "" : note.title;
  const [title, setTitle] = React.useState(initialTitle);
  const [content, setContent] = React.useState(note.content);
  const [status, setStatus] = React.useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = React.useState(() => new Date(note.updatedAt));
  const [mode, setMode] = React.useState<EditorMode>("write");
  const [isFavorite, setIsFavorite] = React.useState(note.isFavorite);
  const [isPublic, setIsPublic] = React.useState(note.isPublic);
  const [slug, setSlug] = React.useState(note.publicSlug);
  const [tags, setTags] = React.useState(noteTags);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const savedRef = React.useRef({ title: initialTitle, content: note.content });
  const savingRef = React.useRef(false);
  const queuedRef = React.useRef(false);

  const [wiki, setWiki] = React.useState<{
    open: boolean;
    query: string;
    start: number;
    position: CaretRect | null;
  }>({ open: false, query: "", start: 0, position: null });
  const [wikiIndex, setWikiIndex] = React.useState(0);

  const wordCount = React.useMemo(() => countWords(content), [content]);
  const headings = React.useMemo<Heading[]>(() => extractHeadings(content), [content]);
  const candidates = React.useMemo(
    () => refs.filter((ref) => ref.id !== note.id),
    [refs, note.id],
  );
  const suggestions = React.useMemo(() => {
    const query = wiki.query.trim().toLowerCase();
    const list = query
      ? candidates.filter((item) => item.title.toLowerCase().includes(query))
      : candidates;
    return list.slice(0, 6);
  }, [candidates, wiki.query]);

  // ------------------------------------------------------------ 保存

  const doSave = React.useCallback(async (): Promise<boolean> => {
    if (savingRef.current) {
      queuedRef.current = true;
      return false;
    }
    savingRef.current = true;
    setStatus("saving");
    const snapshot = { title, content };

    try {
      const result = await updateNote({ id: note.id, title: snapshot.title, content: snapshot.content });
      if (!result.ok) {
        setStatus("error");
        toast.error(result.error);
        return false;
      }
      savedRef.current = snapshot;
      setSavedAt(new Date(result.data.updatedAt));
      setStatus("saved");
      return true;
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => void doSave(), 0);
      }
    }
  }, [content, note.id, title]);

  React.useEffect(() => {
    const dirty = title !== savedRef.current.title || content !== savedRef.current.content;
    if (!dirty) {
      setStatus((current) => (current === "saving" ? current : "saved"));
      return;
    }
    setStatus("editing");
    const timer = window.setTimeout(() => void doSave(), 1200);
    return () => window.clearTimeout(timer);
  }, [title, content, doSave]);

  React.useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const dirty = title !== savedRef.current.title || content !== savedRef.current.content;
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      const dirty = title !== savedRef.current.title || content !== savedRef.current.content;
      if (dirty) void doSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [content, doSave, title]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void doSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doSave]);

  // 恢复上次的视图模式
  React.useEffect(() => {
    const stored = window.localStorage.getItem("sb:editor-mode");
    if (stored === "write" || stored === "split" || stored === "preview") setMode(stored);
  }, []);

  const changeMode = (next: EditorMode) => {
    setMode(next);
    window.localStorage.setItem("sb:editor-mode", next);
  };

  // textarea 自适应高度，外层容器统一滚动
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 320)}px`;
  }, [content, mode]);

  React.useEffect(() => {
    if (!initialTitle && !note.content) titleRef.current?.focus();
  }, [initialTitle, note.content]);

  // ------------------------------------------------------------ 编辑器操作

  const applyEdit = (next: string, caretStart: number, caretEnd = caretStart) => {
    setContent(next);
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretStart, caretEnd);
    });
  };

  const applyCommand = (command: ToolbarCommand) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = content;
    const selected = value.slice(start, end);

    const wrap = (before: string, after: string, placeholder: string) => {
      const text = selected || placeholder;
      const next = value.slice(0, start) + before + text + after + value.slice(end);
      applyEdit(next, start + before.length, start + before.length + text.length);
    };

    const prefixLines = (prefix: string) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const rawEnd = value.indexOf("\n", end);
      const lineEnd = rawEnd === -1 ? value.length : rawEnd;
      const block = value.slice(lineStart, lineEnd) || "";
      const lines = block.split("\n");
      const prefixed = lines
        .map((line, index) => {
          if (prefix === "1. ") return `${index + 1}. ${line.replace(/^(\d+\.|-|\*|\+)\s+/, "")}`;
          return `${prefix}${line.replace(/^(\d+\.|-|\*|\+|>\s?|-\s\[[ x]\]\s+)\s*/, "")}`;
        })
        .join("\n");
      const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
      applyEdit(next, lineStart, lineStart + prefixed.length);
    };

    switch (command) {
      case "h1":
        prefixLines("# ");
        break;
      case "h2":
        prefixLines("## ");
        break;
      case "bold":
        wrap("**", "**", "加粗");
        break;
      case "italic":
        wrap("*", "*", "斜体");
        break;
      case "code":
        wrap("`", "`", "code");
        break;
      case "quote":
        prefixLines("> ");
        break;
      case "ul":
        prefixLines("- ");
        break;
      case "ol":
        prefixLines("1. ");
        break;
      case "task":
        prefixLines("- [ ] ");
        break;
      case "link":
        wrap("[", "](https://)", "链接文字");
        break;
      case "divider": {
        const prefix = value.slice(0, start);
        const suffix = value.slice(end);
        const block = `${prefix.endsWith("\n") || prefix.length === 0 ? "" : "\n"}\n---\n\n`;
        const next = prefix + block + suffix;
        applyEdit(next, start + block.length);
        break;
      }
      default:
        break;
    }
  };

  const syncWiki = (el: HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? 0;
    const before = el.value.slice(0, caret);
    const match = /\[\[([^[\]\n]{0,80})$/.exec(before);

    if (!match) {
      if (wiki.open) setWiki((prev) => ({ ...prev, open: false }));
      return;
    }
    setWikiIndex(0);
    setWiki({
      open: true,
      query: match[1],
      start: caret - match[0].length,
      position: getCaretRect(el, caret - match[0].length),
    });
  };

  const insertWiki = (targetTitle: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? content.length;
    const start = wiki.start;
    const insertion = `[[${targetTitle}]]`;
    const next = content.slice(0, start) + insertion + content.slice(caret);
    setWiki((prev) => ({ ...prev, open: false }));
    applyEdit(next, start + insertion.length);
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (wiki.open) {
      const total = suggestions.length + 1;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setWikiIndex((index) => (index + 1) % total);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setWikiIndex((index) => (index - 1 + total) % total);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (wikiIndex < suggestions.length) insertWiki(suggestions[wikiIndex].title);
        else insertWiki(wiki.query.trim());
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setWiki((prev) => ({ ...prev, open: false }));
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const el = event.currentTarget;
      const start = el.selectionStart;
      const next = `${content.slice(0, start)}  ${content.slice(el.selectionEnd)}`;
      applyEdit(next, start + 2);
      return;
    }

    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyCommand("bold");
    }
    if (meta && event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyCommand("italic");
    }
  };

  const jumpToHeading = (heading: Heading) => {
    const lines = content.split("\n");
    const index = headings.findIndex((item) => item.id === heading.id);
    if (index < 0) return;
    let offset = 0;
    let matchCount = -1;
    for (const line of lines) {
      if (/^#{1,4}\s+/.test(line)) {
        matchCount += 1;
        if (matchCount === index) break;
      }
      offset += line.length + 1;
    }
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(offset, offset);
  };

  // ------------------------------------------------------------ 元操作

  const handleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    const result = await toggleFavorite(note.id);
    if (!result.ok) {
      setIsFavorite(!next);
      toast.error(result.error);
    }
  };

  const handlePublish = async () => {
    const next = !isPublic;
    const result = await setNotePublic(note.id, next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setIsPublic(result.data.isPublic);
    setSlug(result.data.slug);
    toast.success(result.data.isPublic ? "已生成公开链接" : "已取消公开");
  };

  const shareUrl =
    slug && typeof window !== "undefined" ? `${window.location.origin}/share/${slug}` : "";

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("链接已复制");
    } catch {
      window.prompt("复制链接", shareUrl);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteNote(note.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("笔记已删除");
    router.push("/notes");
    router.refresh();
  };

  const handleTagsChange = async (tagIds: string[]) => {
    const previous = tags;
    setTags(allTags.filter((tag) => tagIds.includes(tag.id)));
    const result = await setNoteTags(note.id, tagIds);
    if (!result.ok) {
      setTags(previous);
      toast.error(result.error);
    }
  };

  const goBack = async () => {
    const dirty = title !== savedRef.current.title || content !== savedRef.current.content;
    if (dirty) await doSave();
    router.push("/notes");
  };

  // ------------------------------------------------------------ 渲染

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:px-5">
        <Button variant="ghost" size="icon-sm" onClick={goBack} aria-label="返回列表">
          <ArrowLeft />
        </Button>

        <div className="min-w-0 flex-1" />

        <SaveIndicator status={status} savedAt={savedAt} onRetry={() => void doSave()} />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleFavorite}
          aria-label={isFavorite ? "取消收藏" : "收藏"}
          className={cn(isFavorite && "text-signal hover:text-signal")}
        >
          <Star className={cn(isFavorite && "fill-signal text-signal")} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShareOpen(true)}
          aria-label="分享"
          className={cn(isPublic && "text-link")}
        >
          <Globe />
        </Button>

        <Menu
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="更多操作">
              <MoreHorizontal />
            </Button>
          }
          items={[
            {
              label: isPublic ? "管理公开链接" : "公开分享",
              icon: Globe,
              onSelect: () => setShareOpen(true),
            },
            {
              label: isFavorite ? "取消收藏" : "加入收藏",
              icon: Star,
              onSelect: () => void handleFavorite(),
            },
            {
              label: "删除笔记",
              icon: Trash2,
              danger: true,
              separatorBefore: true,
              onSelect: () => setDeleteOpen(true),
            },
          ]}
        />
      </header>

      <EditorToolbar
        mode={mode}
        onModeChange={changeMode}
        onCommand={applyCommand}
        disabled={mode === "preview"}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full px-5 pb-24 pt-8 md:px-10",
              mode === "split" ? "max-w-6xl" : "max-w-3xl",
            )}
          >
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  textareaRef.current?.focus();
                }
              }}
              placeholder="无标题"
              maxLength={200}
              className="w-full bg-transparent font-reading text-[30px] font-semibold leading-tight tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground/30 md:text-[32px]"
            />

            <TagPicker selected={tags} allTags={allTags} onChange={handleTagsChange} />

            <div
              className={cn(
                "mt-6",
                mode === "split" && "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10",
              )}
            >
              {mode !== "preview" ? (
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      syncWiki(event.target);
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    onKeyUp={(event) => {
                      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                        syncWiki(event.currentTarget);
                      }
                    }}
                    onBlur={() => setWiki((prev) => ({ ...prev, open: false }))}
                    placeholder="开始写…  输入 [[ 可以引用其他笔记"
                    spellCheck={false}
                    className="editor-textarea w-full resize-none border-0 bg-transparent p-0 text-foreground outline-none placeholder:text-muted-foreground/40"
                    style={{ minHeight: 320 }}
                  />
                </div>
              ) : null}

              {mode !== "write" ? (
                <div
                  className={cn(
                    mode === "split" && "border-t border-border/60 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0",
                    mode === "split" && "hidden lg:block",
                    mode === "preview" && "block",
                  )}
                >
                  {content.trim() ? (
                    <MarkdownPreview content={content} refs={candidates} />
                  ) : (
                    <p className="text-[13px] italic text-muted-foreground/60">还没有内容。</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="hidden w-[268px] shrink-0 overflow-y-auto border-l border-border/70 bg-sidebar/40 xl:block">
          <NoteSidePanel
            headings={headings}
            backlinks={backlinks}
            outgoing={outgoing}
            onJumpToHeading={jumpToHeading}
          />
        </aside>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground/70 md:px-4">
        <span className="tabular-nums">{wordCount} 字</span>
        <span className="text-border">·</span>
        <span className="hidden sm:inline">Markdown</span>
        <span className="hidden text-border sm:inline">·</span>
        <span className="hidden items-center gap-1 sm:flex">
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">[[</kbd>
          引用笔记
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Link2 className="size-3" />
          {outgoing.length} 出链 · {backlinks.length} 反链
        </span>
      </footer>

      <WikiAutocomplete
        query={wiki.query}
        items={suggestions}
        activeIndex={wikiIndex}
        position={wiki.open ? wiki.position : null}
        onPick={(item) => insertWiki(item.title)}
        onInsertNew={() => insertWiki(wiki.query.trim())}
        onHover={setWikiIndex}
      />

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={<span className="font-reading text-[17px]">公开分享</span>}
        description="任何拿到链接的人都可以只读查看这篇笔记，不会暴露你的其他内容。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShareOpen(false)}>
              关闭
            </Button>
            <Button variant={isPublic ? "outline" : "default"} onClick={() => void handlePublish()}>
              {isPublic ? "取消公开" : "生成公开链接"}
            </Button>
          </>
        }
      >
        {isPublic && shareUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="bg-background font-mono text-[12px]" />
              <Button variant="outline" size="icon" onClick={copyShareUrl} aria-label="复制链接">
                {copied ? <Check className="text-success" /> : <Link2 />}
              </Button>
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[12px] text-link hover:underline"
            >
              在新标签页打开 ↗
            </a>
          </div>
        ) : (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            当前未公开。点击「生成公开链接」后会得到形如
            <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono text-[11px]">/share/abc123</code>
            的地址。
          </p>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={<span className="font-reading text-[17px]">删除这篇笔记？</span>}
        description="笔记会从列表中移除。第一版暂不支持回收站，请确认后再操作。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "删除中…" : "删除笔记"}
            </Button>
          </>
        }
      >
        <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-[13px]">
          {title || EMPTY_TITLE}
        </p>
      </Modal>
    </div>
  );
}

function SaveIndicator({
  status,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  savedAt: Date;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        保存中
      </span>
    );
  }
  if (status === "editing") {
    return (
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70">
        <span className="size-1.5 rounded-full bg-signal" />
        未保存
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 text-[11.5px] text-danger hover:underline"
      >
        <span className="size-1.5 rounded-full bg-danger" />
        保存失败，重试
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70">
      <Check className="size-3 text-success" />
      {formatRelativeTime(savedAt)}保存
    </span>
  );
}
