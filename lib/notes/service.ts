import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { countWords, normalizeTitle } from "@/lib/utils";

/** 供 Server Component（如 /notes/new）直接建笔记，避免在渲染期调用 Server Action */
export async function createNoteForUser(
  userId: string,
  input: { title?: string; content?: string } = {},
) {
  const db = await getDb();
  const content = input.content ?? "";
  const [row] = await db
    .insert(notes)
    .values({
      userId,
      title: normalizeTitle(input.title ?? ""),
      content,
      wordCount: countWords(content),
    })
    .returning({ id: notes.id });
  return row;
}
