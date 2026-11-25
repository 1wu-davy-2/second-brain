import type { Metadata } from "next";
import { EmptyState } from "@/components/notes/empty-state";
import { NotesView } from "@/components/notes/notes-view";
import { currentUser } from "@/lib/auth";
import { listNotes } from "@/lib/notes/queries";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "全部笔记" };
export const dynamic = "force-dynamic";

const SORTS = ["updated", "created", "title"] as const;
const SORT_LABEL: Record<string, string> = {
  updated: "最近更新优先",
  created: "最近创建优先",
  title: "按标题排序",
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const sort = SORTS.includes(params.sort as (typeof SORTS)[number])
    ? (params.sort as (typeof SORTS)[number])
    : "updated";

  const notes = await listNotes(user.id, { sort, limit: 200 });

  return (
    <NotesView
      title="全部笔记"
      subtitle={`${notes.length} 篇 · ${SORT_LABEL[sort]}`}
      notes={notes}
      sort={sort}
      basePath="/notes"
      empty={
        <EmptyState
          title="还没有笔记"
          description="第一篇不用完美。写下此刻在想的事，之后用 [[ 把它们连起来。"
        />
      }
    />
  );
}
