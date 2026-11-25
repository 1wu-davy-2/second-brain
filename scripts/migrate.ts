import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import path from "node:path";
import { normalizeDatabaseUrl, resolveDatabaseUrl } from "../lib/db/url";

/**
 * 对远程 Neon 执行迁移（HTTP 驱动，逐条语句提交）。
 * 优先读 DATABASE_URL_OVERRIDE（Vercel 集成锁死 DATABASE_URL 时用）。
 * 本地 PGlite 不需要跑这个（开发态首次连库会自动迁移）。
 */
async function main() {
  const raw = resolveDatabaseUrl();
  if (!raw) {
    console.error("缺少 DATABASE_URL / DATABASE_URL_OVERRIDE，无法执行迁移。");
    process.exit(1);
  }

  const db = drizzle(neon(normalizeDatabaseUrl(raw)));

  console.log("→ 执行迁移:", path.join(process.cwd(), "drizzle"));
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("✓ 迁移完成");
}

main().catch((error) => {
  console.error("迁移失败", error);
  process.exit(1);
});
