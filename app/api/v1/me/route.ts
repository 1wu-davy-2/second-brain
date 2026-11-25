import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { json, preflight, withApiAuth } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/me —— 校验密钥是否有效，并返回归属账号 */
export async function GET(request: Request) {
  return withApiAuth(request, async ({ userId, keyName }) => {
    const db = await getDb();
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return json({ user: user ?? null, keyName });
  });
}
