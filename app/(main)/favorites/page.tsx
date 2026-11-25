import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/notes/empty-state";
import { NotesView } from "@/components/notes/notes-view";
import { currentUser } from "@/lib/auth";
import { listNotes } from "@/lib/notes/queries";

export const metadata: Metadata = { title: "收藏" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const notes = await listNotes(user.id, { filter: "favorites", limit: 200 });

  return (
    <NotesView
      title="收藏"
      subtitle={`${notes.length} 篇 · 标记为收藏的笔记`}
      notes={notes}
      sort="updated"
      basePath="/favorites"
      empty={
        <EmptyState
          title="还没有收藏"
          description="编辑器右上角的星标可以把重要笔记固定在这里，方便随时翻回来。"
        />
      }
    />
  );
}
