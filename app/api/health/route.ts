import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function firstRow(result: unknown): Row | undefined {
  if (Array.isArray(result)) return result[0] as Row | undefined;
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows[0] : undefined;
}

/** 部署后自检：数据库可达性 + 迁移是否执行 + 认证密钥是否就位 */
export async function GET() {
  const driver = process.env.DATABASE_URL ? "neon" : "pglite";
  const configured = {
    database: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    platform: process.env.VERCEL ? "vercel" : "local",
  };

  try {
    const db = await getDb();

    // to_regclass 只查系统目录，表不存在也不会报错
    const probe = firstRow(
      await db.execute(sql`
        select
          to_regclass('public.users') is not null as has_users,
          to_regclass('public.notes') is not null as has_notes
      `),
    );

    const hasUsers = Boolean(probe?.has_users);
    let userCount = 0;
    if (hasUsers) {
      const counted = firstRow(await db.execute(sql`select count(*)::int as c from users`));
      userCount = Number(counted?.c ?? 0);
    }

    const schema = { users: hasUsers, notes: Boolean(probe?.has_notes), userCount };

    if (!schema.users) {
      return NextResponse.json(
        {
          ok: false,
          driver,
          configured,
          schema,
          error: "schema_not_migrated",
          hint: "这个 DATABASE_URL 指向的库没有表，先对同一个库执行 pnpm db:migrate && pnpm db:seed-admin",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      driver,
      configured,
      schema,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] 数据库连接失败", error);
    return NextResponse.json(
      {
        ok: false,
        driver,
        configured,
        error: configured.database ? "database_unreachable" : "missing_database_url",
      },
      { status: 500 },
    );
  }
}
