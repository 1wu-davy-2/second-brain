import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { noteTags, notes, tags } from "@/lib/db/schema";
import { refreshNotesReferencing, syncNoteLinks } from "@/lib/notes/links";
import { listNotes } from "@/lib/notes/queries";
import { countWords, normalizeTitle } from "@/lib/utils";

export interface ApiNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 标签用名字传，不存在就顺手建，外部调用不需要先查 UUID */
async function ensureTagIds(userId: string, names: string[]): Promise<string[]> {
  const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    .slice(0, 20)
    .map((name) => name.slice(0, 30));
  if (clean.length === 0) return [];

  const db = await getDb();
  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, clean)));

  const map = new Map(existing.map((tag) => [tag.name, tag.id]));
  const missing = clean.filter((name) => !map.has(name));

  if (missing.length > 0) {
    const created = await db
      .insert(tags)
      .values(missing.map((name) => ({ userId, name })))
      .onConflictDoNothing()
      .returning({ id: tags.id, name: tags.name });
    for (const tag of created) map.set(tag.name, tag.id);
    // 冲突跳过时补一次查询
    if (created.length < missing.length) {
      const fallback = await db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.name, missing)));
      for (const tag of fallback) map.set(tag.name, tag.id);
    }
  }

  return clean.map((name) => map.get(name)).filter((id): id is string => Boolean(id));
}

export async function getNoteForApi(userId: string, id: string): Promise<ApiNote | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      isFavorite: notes.isFavorite,
      isPublic: notes.isPublic,
      publicSlug: notes.publicSlug,
      wordCount: notes.wordCount,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);

  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId))
    .where(eq(noteTags.noteId, row.id))
    .orderBy(asc(tags.name));

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: tagRows.map((tag) => tag.name),
    isFavorite: row.isFavorite,
    isPublic: row.isPublic,
    publicSlug: row.publicSlug,
    wordCount: row.wordCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createNoteForApi(
  userId: string,
  input: { title?: string; content?: string; tags?: string[] },
): Promise<ApiNote> {
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

  if (input.tags && input.tags.length > 0) {
    const tagIds = await ensureTagIds(userId, input.tags);
    if (tagIds.length > 0) {
      await db
        .insert(noteTags)
        .values(tagIds.map((tagId) => ({ noteId: row.id, tagId })))
        .onConflictDoNothing();
    }
  }

  if (content.trim()) {
    await syncNoteLinks(db, userId, row.id, content);
  }

  const created = await getNoteForApi(userId, row.id);
  if (!created) throw new Error("NOTE_CREATE_FAILED");
  return created;
}

export async function updateNoteForApi(
  userId: string,
  id: string,
  input: { title?: string; content?: string; tags?: string[] },
): Promise<ApiNote | null> {
  const db = await getDb();
  const [existing] = await db
    .select({ title: notes.title, content: notes.content })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);

  if (!existing) return null;

  const nextTitle = input.title !== undefined ? normalizeTitle(input.title) : existing.title;
  const nextContent = input.content !== undefined ? input.content : existing.content;

  await db
    .update(notes)
    .set({
      title: nextTitle,
      content: nextContent,
      wordCount: countWords(nextContent),
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));

  if (input.tags !== undefined) {
    await db.delete(noteTags).where(eq(noteTags.noteId, id));
    if (input.tags.length > 0) {
      const tagIds = await ensureTagIds(userId, input.tags);
      if (tagIds.length > 0) {
        await db
          .insert(noteTags)
          .values(tagIds.map((tagId) => ({ noteId: id, tagId })))
          .onConflictDoNothing();
      }
    }
  }

  await syncNoteLinks(db, userId, id, nextContent);
  if (nextTitle !== existing.title) {
    await refreshNotesReferencing(db, userId, existing.title);
  }

  return getNoteForApi(userId, id);
}

export async function deleteNoteForApi(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);
  if (!row) return false;

  await db
    .update(notes)
    .set({ deletedAt: new Date(), isPublic: false, publicSlug: null })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
  await db.delete(noteTags).where(eq(noteTags.noteId, id));
  return true;
}

export async function searchNotesForApi(
  userId: string,
  options: { query?: string; tag?: string; limit?: number; offset?: number },
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  // 标签先解析成 id，交给 SQL 过滤，避免先截断再过滤导致结果偏少
  let tagId: string | undefined;
  if (options.tag) {
    const db = await getDb();
    const [row] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, options.tag)))
      .limit(1);
    if (!row) return { total: 0, notes: [] };
    tagId = row.id;
  }

  const items = await listNotes(userId, {
    q: options.query,
    tagId,
    sort: "updated",
    limit,
    offset,
  });

  return {
    total: items.length,
    notes: items.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      tags: item.tags.map((tag) => tag.name),
      isFavorite: item.isFavorite,
      isPublic: item.isPublic,
      wordCount: item.wordCount,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export async function listTagsForApi(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
  return rows;
}
