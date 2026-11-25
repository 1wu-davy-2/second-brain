import { Search } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/notes/empty-state";
import { NoteRow } from "@/components/notes/note-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUser } from "@/lib/auth";
import { searchNotes } from "@/lib/notes/queries";

export const metadata: Metadata = { title: "搜索" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const results = query ? await searchNotes(user.id, query, 50) : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/70 px-4 py-3.5 md:px-8">
        <form action="/search" className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="搜索标题与正文…"
              className="pl-8"
              autoFocus
            />
          </div>
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-3 py-3 md:px-6 md:py-4">
          {!query ? (
            <p className="px-3 py-16 text-center text-[13px] text-muted-foreground">
              输入关键词开始搜索。支持中文、英文，标题命中的结果排在前面。
            </p>
          ) : results.length === 0 ? (
            <EmptyState
              title={`没有找到「${query}」`}
              description="换个关键词试试，或者直接新建一篇笔记把想法记下来。"
            />
          ) : (
            <>
              <p className="px-3 pb-2 text-[11.5px] text-muted-foreground">
                {results.length} 条结果 · 关键词「{query}」
              </p>
              <div className="divide-y divide-border/60">
                {results.map((note) => (
                  <NoteRow key={note.id} note={note} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
