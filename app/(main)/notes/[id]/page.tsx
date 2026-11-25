import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NoteEditor } from "@/components/editor/note-editor";
import { currentUser } from "@/lib/auth";
import {
  getAllUserTags,
  getBacklinks,
  getNote,
  getNoteTags,
  getOutgoingLinks,
  listNoteRefs,
} from "@/lib/notes/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return { title: "笔记" };
  const note = await getNote(user.id, id);
  return { title: note?.title ?? "笔记" };
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const note = await getNote(user.id, id);
  if (!note) notFound();

  const [noteTags, allTags, backlinks, outgoing, refs] = await Promise.all([
    getNoteTags(user.id, id),
    getAllUserTags(user.id),
    getBacklinks(user.id, id),
    getOutgoingLinks(user.id, id),
    listNoteRefs(user.id),
  ]);

  return (
    <NoteEditor
      note={{
        id: note.id,
        title: note.title,
        content: note.content,
        isFavorite: note.isFavorite,
        isPublic: note.isPublic,
        publicSlug: note.publicSlug,
        wordCount: note.wordCount,
        updatedAt: note.updatedAt.toISOString(),
      }}
      noteTags={noteTags}
      allTags={allTags}
      backlinks={backlinks.map((item) => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        updatedAt: item.updatedAt.toISOString(),
      }))}
      outgoing={outgoing.map((item) => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        updatedAt: item.updatedAt.toISOString(),
      }))}
      refs={refs}
    />
  );
}
