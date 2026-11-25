import { createHash, randomBytes } from "node:crypto";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../lib/db/index";
import { apiKeys, users } from "../lib/db/schema";

/**
 * 管理外部访问用的 API 密钥。
 *   pnpm api:key create <name>   # 创建，token 只打印一次（stdout）
 *   pnpm api:key list            # 列出密钥（不显示明文）
 *   pnpm api:key revoke <id>     # 吊销
 */

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const [command = "create", argument] = process.argv.slice(2);
  const db = await getDb();

  if (command === "list") {
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    if (rows.length === 0) {
      console.error("还没有任何密钥，用 pnpm api:key create <name> 创建。");
      return;
    }
    for (const row of rows) {
      console.error(
        [
          row.id,
          row.name,
          `${row.prefix}…`,
          row.revokedAt ? "已吊销" : "有效",
          `创建 ${row.createdAt.toISOString().slice(0, 10)}`,
          row.lastUsedAt ? `最近使用 ${row.lastUsedAt.toISOString().slice(0, 16).replace("T", " ")}` : "未使用",
        ].join("  |  "),
      );
    }
    return;
  }

  if (command === "revoke") {
    if (!argument) throw new Error("用法：pnpm api:key revoke <key-id>");
    const result = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, argument))
      .returning({ id: apiKeys.id });
    if (result.length === 0) throw new Error("没有找到这个密钥");
    console.error(`✓ 已吊销 ${argument}`);
    return;
  }

  if (command !== "create") {
    throw new Error(`未知命令：${command}（可用 create / list / revoke）`);
  }

  const name = (argument ?? "default").slice(0, 40);
  const username = process.env.ADMIN_USERNAME ?? "admin";

  const [user] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error(`没有找到用户 ${username}，先执行 pnpm db:seed-admin`);
  }

  const token = `sb_live_${randomBytes(24).toString("base64url")}`;
  await db.insert(apiKeys).values({
    userId: user.id,
    name,
    prefix: token.slice(0, 12),
    tokenHash: hashToken(token),
  });

  console.error(`✓ 已为 ${username} 创建密钥「${name}」，明文只显示这一次：`);
  // 明文单独走 stdout，方便重定向到文件
  console.log(token);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("操作失败：", error instanceof Error ? error.message : error);
    process.exit(1);
  });
