import { eq, or } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { getDb } from "../lib/db/index";
import { users } from "../lib/db/schema";
import { seedWorkspace } from "../lib/seed";

/**
 * 创建/重置默认管理员账号。
 * 用法：pnpm tsx --env-file=.env.local scripts/seed-admin.ts
 */
async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const email = (process.env.ADMIN_EMAIL ?? `${username}@secondbrain.local`).trim().toLowerCase();

  if (!username) throw new Error("ADMIN_USERNAME 为空");
  if (password.length < 6) throw new Error("ADMIN_PASSWORD 至少 6 位");

  const db = await getDb();
  const [existing] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);

  const passwordHash = hashPassword(password);

  if (existing) {
    await db
      .update(users)
      .set({ username, passwordHash, email, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    console.log(`✓ 已更新管理员：${username} (${email})`);
  } else {
    const [created] = await db
      .insert(users)
      .values({
        username,
        email,
        name: username,
        passwordHash,
        emailVerified: new Date(),
      })
      .returning({ id: users.id });
    console.log(`✓ 已创建管理员：${username} (${email})`);
    // 首次创建时写入示例笔记，登录后不是空界面
    await seedWorkspace(created.id);
  }

  console.log("  密码已按 scrypt 存储，原文不回显。");
  process.exit(0);
}

main().catch((error) => {
  console.error("创建管理员失败：", error instanceof Error ? error.message : error);
  process.exit(1);
});
