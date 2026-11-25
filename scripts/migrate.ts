import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import path from "node:path";

/**
 * 对远程 Neon 执行迁移（HTTP 驱动，逐条语句提交）。
 * 本地 PGlite 不需要跑这个（开发态首次连库会自动迁移）。
 */
async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("缺少 DATABASE_URL，无法执行迁移。");
    process.exit(1);
  }

  // 与 lib/db/index.ts 保持一致：去掉 libpq 专用参数
  const url = raw
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace(/[?&]$/, "")
    .replace("?&", "?");

  const db = drizzle(neon(url));

  console.log("→ 执行迁移:", path.join(process.cwd(), "drizzle"));
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("✓ 迁移完成");
}

main().catch((error) => {
  console.error("迁移失败", error);
  process.exit(1);
});
