import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import path from "node:path";
import { WebSocket as WsWebSocket } from "ws";

/**
 * 对远程 Neon / Postgres 执行迁移。
 * 本地 PGlite 不需要跑这个（开发态首次连库会自动迁移）。
 */
async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("缺少 DATABASE_URL，无法执行迁移。");
    process.exit(1);
  }

  // 与 lib/db/index.ts 保持一致：ws + 去掉 channel_binding
  neonConfig.webSocketConstructor = WsWebSocket as unknown as typeof globalThis.WebSocket;
  const url = raw
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace(/[?&]$/, "")
    .replace("?&", "?");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log("→ 执行迁移:", path.join(process.cwd(), "drizzle"));
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await pool.end();
  console.log("✓ 迁移完成");
}

main().catch((error) => {
  console.error("迁移失败", error);
  process.exit(1);
});
