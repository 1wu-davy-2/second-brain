import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

/**
 * 双驱动：
 * - 设置 DATABASE_URL  -> Neon（生产 / 远程 Postgres，HTTP 驱动，无长连接）
 * - 未设置            -> PGlite（本地嵌入式 Postgres，数据落在 ./.data/pgdata）
 *
 * 两个驱动的 drizzle 实例类型不同，这里统一收敛到一个类型，运行时行为一致。
 */

export type Database = PgliteDatabase<typeof schema>;

type GlobalDb = {
  promise: Promise<Database> | null;
};

const globalForDb = globalThis as unknown as { __secondBrainDb?: GlobalDb };

/**
 * 用 Neon 的 HTTP 驱动（fetch）而不是 WebSocket 驱动：
 * - 不需要 ws / 原生 WebSocket，Vercel 与本地行为一致
 * - 本项目不使用事务，HTTP 驱动的限制不构成问题
 * 去掉 libpq 专用参数，避免驱动解析报错。
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace(/[?&]$/, "")
    .replace("?&", "?");
}

function createNeon(url: string): Database {
  const client = neon(normalizeUrl(url));
  return drizzleNeon(client, { schema }) as unknown as Database;
}

async function createPglite(): Promise<Database> {
  if (process.env.VERCEL) {
    throw new Error(
      "Vercel 环境缺少 DATABASE_URL：Serverless 文件系统只读，无法使用本地 PGlite。请在环境变量中配置 Neon 连接串后重新部署。",
    );
  }
  // 动态加载：生产环境有 DATABASE_URL 时完全不需要 WASM 包，也避免被打进 serverless bundle
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".data", "pgdata");
  // PGlite 只会在 dataDir 内递归建目录，父目录需要自己保证存在
  mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  // 本地开发自动建表 / 迁移，零配置即可跑
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}

async function init(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) {
    return createNeon(url);
  }
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    // Vercel 上没有 DATABASE_URL 时不该静默降级到 WASM 文件库
    console.warn("[db] 未设置 DATABASE_URL，正在使用 PGlite（数据不可持久化到磁盘，仅供预览）");
  }
  return createPglite();
}

export function getDb(): Promise<Database> {
  if (!globalForDb.__secondBrainDb) {
    globalForDb.__secondBrainDb = { promise: null };
  }
  const holder = globalForDb.__secondBrainDb;
  if (!holder.promise) {
    holder.promise = init().catch((error) => {
      holder.promise = null;
      throw error;
    });
  }
  return holder.promise;
}

/** 便捷写法：await db() 直接拿实例 */
export const db = getDb;

export { schema };
