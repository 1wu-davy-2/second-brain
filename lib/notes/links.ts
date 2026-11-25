import { and, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";
import { extractWikiLinkTargets } from "@/lib/markdown/wiki-links";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * 重算一篇笔记的出链：先清空，再按 [[标题]] 解析目标。
 * 解析不到的目标不写库（渲染时显示为「缺失链接」，点击可新建）。
 */
export async function syncNoteLinks(
  db: Database,
  userId: string,
  noteId: string,
  content: string,
) {
  await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, noteId));

  const targets = extractWikiLinkTargets(content);
  if (targets.length === 0) return;

  const lowered = [...new Set(targets.map((title) => title.toLowerCase()))];
  const matched = await db
    .select({ id: notes.id })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.deletedAt),
        inArray(sql`lower(${notes.title})`, lowered),
      ),
    );

  const values = matched
    .filter((row) => row.id !== noteId)
    .map((row) => ({ sourceNoteId: noteId, targetNoteId: row.id }));

  if (values.length === 0) return;
  await db.insert(noteLinks).values(values).onConflictDoNothing();
}

/**
 * 标题改名后，所有引用旧标题的笔记需要重算链接关系（旧链接失效 → 删除对应关系）。
 */
export async function refreshNotesReferencing(
  db: Database,
  userId: string,
  oldTitle: string,
) {
  const needle = `%[[${escapeLike(oldTitle)}]]%`;
  const affected = await db
    .select({ id: notes.id, content: notes.content })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt), ilike(notes.content, needle)))
    .limit(200);

  for (const row of affected) {
    await syncNoteLinks(db, userId, row.id, row.content);
  }
}
