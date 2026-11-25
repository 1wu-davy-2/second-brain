import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { noteTags, notes, tags } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EXPORT_VERSION = "0.1.0";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "未登录" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const format = new URL(request.url).searchParams.get("format");
  const db = await getDb();

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      isFavorite: notes.isFavorite,
      isPublic: notes.isPublic,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, user.id), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));

  // 一次查询取全部标签，再按 noteId 分组，避免 N+1
  const noteIds = rows.map((row) => row.id);
  const tagRows =
    noteIds.length > 0
      ? await db
          .select({ noteId: noteTags.noteId, name: tags.name })
          .from(noteTags)
          .innerJoin(tags, eq(tags.id, noteTags.tagId))
          .where(inArray(noteTags.noteId, noteIds))
          .orderBy(asc(tags.name))
      : [];

  const tagsByNote = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tagsByNote.get(row.noteId) ?? [];
    list.push(row.name);
    tagsByNote.set(row.noteId, list);
  }

  if (format === "md") {
    const exportedAt = new Date();
    const header = [
      "# 第二大脑导出",
      "",
      `导出时间：${formatDateTime(exportedAt)}`,
      `笔记数量：${rows.length} 篇`,
    ].join("\n");

    const body =
      header +
      rows
        .map(
          (row) =>
            `\n\n---\n\n# ${row.title}\n\n> 创建于 ${formatDateTime(row.createdAt)} ｜ 更新于 ${formatDateTime(row.updatedAt)}\n\n${row.content}\n`,
        )
        .join("");

    const stamp = `${exportedAt.getFullYear()}-${String(exportedAt.getMonth() + 1).padStart(2, "0")}-${String(exportedAt.getDate()).padStart(2, "0")}`;

    return new Response(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="second-brain-${stamp}.md"`,
      },
    });
  }

  return jsonResponse({
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    notes: rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: tagsByNote.get(row.id) ?? [],
      isFavorite: row.isFavorite,
      isPublic: row.isPublic,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}
