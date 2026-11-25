import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { noteLinks, noteTags, notes, tags, users } from "@/lib/db/schema";
import { buildExcerpt } from "@/lib/utils";

export interface TagChip {
  id: string;
  name: string;
  color: string | null;
}

export interface NoteListItem {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
  createdAt: Date;
  isFavorite: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  wordCount: number;
  tags: TagChip[];
}

export interface NoteListOptions {
  filter?: "all" | "favorites" | "public";
  tagId?: string;
  q?: string;
  sort?: "updated" | "created" | "title";
  limit?: number;
  offset?: number;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function attachTags(items: NoteListItem[]) {
  if (items.length === 0) return items;
  const db = await getDb();
  const rows = await db
    .select({
      noteId: noteTags.noteId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId))
    .where(
      inArray(
        noteTags.noteId,
        items.map((item) => item.id),
      ),
    )
    .orderBy(asc(tags.name));

  const grouped = new Map<string, TagChip[]>();
  for (const row of rows) {
    const list = grouped.get(row.noteId) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    grouped.set(row.noteId, list);
  }
  return items.map((item) => ({ ...item, tags: grouped.get(item.id) ?? [] }));
}

export async function listNotes(userId: string, options: NoteListOptions = {}) {
  const db = await getDb();
  const conditions = [eq(notes.userId, userId), isNull(notes.deletedAt)];

  if (options.filter === "favorites") conditions.push(eq(notes.isFavorite, true));
  if (options.filter === "public") conditions.push(eq(notes.isPublic, true));

  if (options.q && options.q.trim()) {
    const pattern = `%${escapeLike(options.q.trim())}%`;
    conditions.push(or(ilike(notes.title, pattern), ilike(notes.content, pattern))!);
  }

  if (options.tagId) {
    conditions.push(
      sql`exists (select 1 from note_tags nt where nt.note_id = ${notes.id} and nt.tag_id = ${options.tagId})`,
    );
  }

  const orderBy =
    options.sort === "title"
      ? asc(notes.title)
      : options.sort === "created"
        ? desc(notes.createdAt)
        : desc(notes.updatedAt);

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      updatedAt: notes.updatedAt,
      createdAt: notes.createdAt,
      isFavorite: notes.isFavorite,
      isPublic: notes.isPublic,
      publicSlug: notes.publicSlug,
      wordCount: notes.wordCount,
    })
    .from(notes)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(options.limit ?? 60)
    .offset(options.offset ?? 0);

  const items: NoteListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: buildExcerpt(row.content),
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    isFavorite: row.isFavorite,
    isPublic: row.isPublic,
    publicSlug: row.publicSlug,
    wordCount: row.wordCount,
    tags: [],
  }));

  return attachTags(items);
}

export async function countNotes(userId: string, filter: "all" | "favorites" | "public" = "all") {
  const db = await getDb();
  const conditions = [eq(notes.userId, userId), isNull(notes.deletedAt)];
  if (filter === "favorites") conditions.push(eq(notes.isFavorite, true));
  if (filter === "public") conditions.push(eq(notes.isPublic, true));

  const [row] = await db
    .select({ value: count() })
    .from(notes)
    .where(and(...conditions));
  return Number(row?.value ?? 0);
}

export async function listTagsWithCounts(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      value: count(notes.id),
    })
    .from(tags)
    .leftJoin(noteTags, eq(noteTags.tagId, tags.id))
    .leftJoin(notes, and(eq(notes.id, noteTags.noteId), isNull(notes.deletedAt)))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id, tags.name, tags.color)
    .orderBy(asc(tags.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    count: Number(row.value ?? 0),
  }));
}

export async function getNote(userId: string, noteId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getNoteTags(userId: string, noteId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId))
    .where(and(eq(noteTags.noteId, noteId), eq(tags.userId, userId)))
    .orderBy(asc(tags.name));
  return rows;
}

export interface LinkedNote {
  id: string;
  title: string;
  updatedAt: Date;
  excerpt: string;
}

export async function getBacklinks(userId: string, noteId: string): Promise<LinkedNote[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
      content: notes.content,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(notes.id, noteLinks.sourceNoteId))
    .where(
      and(eq(noteLinks.targetNoteId, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)),
    )
    .orderBy(desc(notes.updatedAt))
    .limit(50);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    excerpt: buildExcerpt(row.content, 100),
  }));
}

export async function getOutgoingLinks(userId: string, noteId: string): Promise<LinkedNote[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
      content: notes.content,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(notes.id, noteLinks.targetNoteId))
    .where(
      and(eq(noteLinks.sourceNoteId, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)),
    )
    .orderBy(desc(notes.updatedAt))
    .limit(50);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    excerpt: buildExcerpt(row.content, 100),
  }));
}

export async function listNoteRefs(userId: string, limit = 800) {
  const db = await getDb();
  const rows = await db
    .select({ id: notes.id, title: notes.title })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);
  return rows;
}

export async function searchNotes(userId: string, query: string, limit = 8) {
  const term = query.trim();
  if (!term) return [];
  const db = await getDb();
  const pattern = `%${escapeLike(term)}%`;

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      updatedAt: notes.updatedAt,
      createdAt: notes.createdAt,
      isFavorite: notes.isFavorite,
      isPublic: notes.isPublic,
      publicSlug: notes.publicSlug,
      wordCount: notes.wordCount,
    })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.deletedAt),
        or(ilike(notes.title, pattern), ilike(notes.content, pattern)),
      ),
    )
    .orderBy(
      sql`case when ${notes.title} ilike ${pattern} then 0 else 1 end`,
      desc(notes.updatedAt),
    )
    .limit(limit);

  const items: NoteListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: buildExcerpt(row.content, 90),
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    isFavorite: row.isFavorite,
    isPublic: row.isPublic,
    publicSlug: row.publicSlug,
    wordCount: row.wordCount,
    tags: [],
  }));

  return attachTags(items);
}

export async function getSidebarData(userId: string) {
  const [all, favorites, publicCount, tagRows] = await Promise.all([
    countNotes(userId, "all"),
    countNotes(userId, "favorites"),
    countNotes(userId, "public"),
    listTagsWithCounts(userId),
  ]);
  return {
    counts: { all, favorites, public: publicCount },
    tags: tagRows.filter((tag) => tag.count > 0),
  };
}

export async function getPublicNote(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      note: notes,
      authorName: users.name,
    })
    .from(notes)
    .innerJoin(users, eq(users.id, notes.userId))
    .where(
      and(eq(notes.publicSlug, slug), eq(notes.isPublic, true), isNull(notes.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function listRecentNotes(userId: string, limit = 5) {
  return listNotes(userId, { limit, sort: "updated" });
}

export async function getAllUserTags(userId: string) {
  const db = await getDb();
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
}
