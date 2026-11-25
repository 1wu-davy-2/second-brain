import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/notes/empty-state";
import { NotesView } from "@/components/notes/notes-view";
import { currentUser } from "@/lib/auth";
import { listNotes } from "@/lib/notes/queries";
import { getTag } from "@/lib/notes/tags";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return { title: "标签" };
  const tag = await getTag(user.id, id);
  return { title: tag ? `#${tag.name}` : "标签" };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tag = await getTag(user.id, id);
  if (!tag) notFound();

  const query = await searchParams;
  const sort = query.sort === "title" || query.sort === "created" ? query.sort : "updated";
  const notes = await listNotes(user.id, { tagId: tag.id, sort, limit: 200 });

  return (
    <NotesView
      title={`#${tag.name}`}
      subtitle={`${notes.length} 篇 · 使用该标签的笔记`}
      notes={notes}
      sort={sort}
      basePath={`/tags/${tag.id}`}
      empty={
        <EmptyState
          title="这个标签下还没有笔记"
          description="在任意笔记里点「标签」把它加进来，这里就会自动汇总。"
        />
      }
    />
  );
}
