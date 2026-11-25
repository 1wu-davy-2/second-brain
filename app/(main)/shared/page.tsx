import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/notes/empty-state";
import { NotesView } from "@/components/notes/notes-view";
import { currentUser } from "@/lib/auth";
import { listNotes } from "@/lib/notes/queries";

export const metadata: Metadata = { title: "已分享" };
export const dynamic = "force-dynamic";

export default async function SharedPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const notes = await listNotes(user.id, { filter: "public", limit: 200 });

  return (
    <NotesView
      title="已分享"
      subtitle={`${notes.length} 篇 · 通过只读链接公开`}
      notes={notes}
      sort="updated"
      basePath="/shared"
      empty={
        <EmptyState
          title="还没有公开的笔记"
          description="打开任意笔记，在右上角菜单里选择「公开分享」，会生成一个只读链接。"
        />
      }
    />
  );
}
