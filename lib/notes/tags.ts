import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tags } from "@/lib/db/schema";

export async function getTag(userId: string, tagId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1);
  return row ?? null;
}
