import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

export interface ApiAuth {
  userId: string;
  keyId: string;
  keyName: string;
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 从 Authorization: Bearer <token> 解析并校验 API 密钥 */
export async function authenticateRequest(request: Request): Promise<ApiAuth | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;

  const token = match[1].trim();
  if (token.length < 16) return null;

  const db = await getDb();
  const [row] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.tokenHash, hashApiToken(token)), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) return null;

  // 记录使用时间，失败不影响本次请求
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => undefined);

  return { userId: row.userId, keyId: row.id, keyName: row.name };
}
