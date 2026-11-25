"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { noteTags, notes, tags } from "@/lib/db/schema";
import { refreshNotesReferencing, syncNoteLinks } from "@/lib/notes/links";
import { countWords, normalizeTitle, randomSlug } from "@/lib/utils";

async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const userId = await requireUserId();
    return actionOk(await fn(userId));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return actionError("登录状态已失效，请重新登录");
    }
    console.error("[action]", error);
    return actionError("操作失败，请稍后重试");
  }
}

function revalidateNotes(noteId?: string) {
  revalidatePath("/notes");
  if (noteId) revalidatePath(`/notes/${noteId}`);
}

const createSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(200_000).optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
});

export async function createNote(input: {
  title?: string;
  content?: string;
  tagIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  return withUser(async (userId) => {
    const parsed = createSchema.parse(input ?? {});
    const db = await getDb();
    const content = parsed.content ?? "";
    const [row] = await db
      .insert(notes)
      .values({
        userId,
        title: normalizeTitle(parsed.title ?? ""),
        content,
        wordCount: countWords(content),
      })
      .returning({ id: notes.id });

    if (parsed.tagIds && parsed.tagIds.length > 0) {
      await attachTags(userId, row.id, parsed.tagIds);
    }
    if (content.trim()) {
      await syncNoteLinks(db, userId, row.id, content);
    }

    revalidateNotes();
    return { id: row.id };
  });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(200).optional(),
  content: z.string().max(200_000).optional(),
});

export async function updateNote(input: {
  id: string;
  title?: string;
  content?: string;
}): Promise<ActionResult<{ id: string; updatedAt: string; wordCount: number }>> {
  return withUser(async (userId) => {
    const parsed = updateSchema.parse(input);
    const db = await getDb();

    const [existing] = await db
      .select({ title: notes.title, content: notes.content })
      .from(notes)
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId), isNull(notes.deletedAt)))
      .limit(1);

    if (!existing) throw new Error("NOT_FOUND");

    const nextTitle = parsed.title !== undefined ? normalizeTitle(parsed.title) : existing.title;
    const nextContent = parsed.content !== undefined ? parsed.content : existing.content;
    const wordCount = countWords(nextContent);

    const [updated] = await db
      .update(notes)
      .set({
        title: nextTitle,
        content: nextContent,
        wordCount,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)))
      .returning({ updatedAt: notes.updatedAt });

    await syncNoteLinks(db, userId, parsed.id, nextContent);
    if (nextTitle !== existing.title) {
      await refreshNotesReferencing(db, userId, existing.title);
    }

    revalidateNotes(parsed.id);
    if (existing.title !== nextTitle) revalidatePath("/search");

    return {
      id: parsed.id,
      updatedAt: updated.updatedAt.toISOString(),
      wordCount,
    };
  });
}

export async function deleteNote(id: string): Promise<ActionResult<{ id: string }>> {
  return withUser(async (userId) => {
    const parsed = z.string().uuid().parse(id);
    const db = await getDb();
    await db
      .update(notes)
      .set({ deletedAt: new Date(), isPublic: false, publicSlug: null })
      .where(and(eq(notes.id, parsed), eq(notes.userId, userId)));
    await db.delete(noteTags).where(eq(noteTags.noteId, parsed));
    revalidateNotes(parsed);
    return { id: parsed };
  });
}

export async function toggleFavorite(id: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  return withUser(async (userId) => {
    const parsed = z.string().uuid().parse(id);
    const db = await getDb();
    const [row] = await db
      .select({ isFavorite: notes.isFavorite })
      .from(notes)
      .where(and(eq(notes.id, parsed), eq(notes.userId, userId)))
      .limit(1);
    if (!row) throw new Error("NOT_FOUND");

    const next = !row.isFavorite;
    await db
      .update(notes)
      .set({ isFavorite: next, updatedAt: new Date() })
      .where(and(eq(notes.id, parsed), eq(notes.userId, userId)));

    revalidateNotes(parsed);
    return { isFavorite: next };
  });
}

export async function setNotePublic(
  id: string,
  publish: boolean,
): Promise<ActionResult<{ isPublic: boolean; slug: string | null }>> {
  return withUser(async (userId) => {
    const parsed = z.string().uuid().parse(id);
    const db = await getDb();
    const [row] = await db
      .select({ isPublic: notes.isPublic, publicSlug: notes.publicSlug })
      .from(notes)
      .where(and(eq(notes.id, parsed), eq(notes.userId, userId), isNull(notes.deletedAt)))
      .limit(1);
    if (!row) throw new Error("NOT_FOUND");

    if (!publish) {
      await db
        .update(notes)
        .set({ isPublic: false, updatedAt: new Date() })
        .where(and(eq(notes.id, parsed), eq(notes.userId, userId)));
      revalidateNotes(parsed);
      return { isPublic: false, slug: row.publicSlug };
    }

    let slug = row.publicSlug;
    if (!slug) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = randomSlug();
        const clash = await db
          .select({ id: notes.id })
          .from(notes)
          .where(eq(notes.publicSlug, candidate))
          .limit(1);
        if (clash.length === 0) {
          slug = candidate;
          break;
        }
      }
    }
    if (!slug) throw new Error("SLUG_CONFLICT");

    await db
      .update(notes)
      .set({ isPublic: true, publicSlug: slug, updatedAt: new Date() })
      .where(and(eq(notes.id, parsed), eq(notes.userId, userId)));

    revalidateNotes(parsed);
    revalidatePath(`/share/${slug}`);
    return { isPublic: true, slug };
  });
}

// ---------------------------------------------------------------- 标签

async function attachTags(userId: string, noteId: string, tagIds: string[]) {
  if (tagIds.length === 0) return;
  const db = await getDb();
  const owned = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));
  if (owned.length === 0) return;
  await db
    .insert(noteTags)
    .values(owned.map((tag) => ({ noteId, tagId: tag.id })))
    .onConflictDoNothing();
}

export async function setNoteTags(
  noteId: string,
  tagIds: string[],
): Promise<ActionResult<{ tagIds: string[] }>> {
  return withUser(async (userId) => {
    const parsedNoteId = z.string().uuid().parse(noteId);
    const parsedTagIds = z.array(z.string().uuid()).max(30).parse(tagIds);
    const db = await getDb();

    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.id, parsedNoteId), eq(notes.userId, userId)))
      .limit(1);
    if (!note) throw new Error("NOT_FOUND");

    await db.delete(noteTags).where(eq(noteTags.noteId, parsedNoteId));
    if (parsedTagIds.length > 0) {
      await attachTags(userId, parsedNoteId, parsedTagIds);
    }

    revalidateNotes(parsedNoteId);
    return { tagIds: parsedTagIds };
  });
}

export async function createTag(
  name: string,
): Promise<ActionResult<{ id: string; name: string; color: string | null }>> {
  return withUser(async (userId) => {
    const clean = z
      .string()
      .trim()
      .min(1, "标签名不能为空")
      .max(30, "标签最多 30 个字符")
      .parse(name);
    const db = await getDb();

    const [existing] = await db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, clean)))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(tags)
      .values({ userId, name: clean })
      .returning({ id: tags.id, name: tags.name, color: tags.color });

    revalidatePath("/notes");
    return created;
  });
}

export async function deleteTag(id: string): Promise<ActionResult<{ id: string }>> {
  return withUser(async (userId) => {
    const parsed = z.string().uuid().parse(id);
    const db = await getDb();
    await db.delete(tags).where(and(eq(tags.id, parsed), eq(tags.userId, userId)));
    revalidatePath("/notes");
    return { id: parsed };
  });
}

export async function renameTag(
  id: string,
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  return withUser(async (userId) => {
    const parsedId = z.string().uuid().parse(id);
    const clean = z.string().trim().min(1).max(30).parse(name);
    const db = await getDb();
    const [updated] = await db
      .update(tags)
      .set({ name: clean })
      .where(and(eq(tags.id, parsedId), eq(tags.userId, userId)))
      .returning({ id: tags.id, name: tags.name });
    if (!updated) throw new Error("NOT_FOUND");
    revalidatePath("/notes");
    return updated;
  });
}
