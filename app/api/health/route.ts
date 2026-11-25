import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 部署后自检：确认数据库可达，并返回当前驱动 */
export async function GET() {
  const driver = process.env.DATABASE_URL ? "neon" : "pglite";
  const configured = {
    database: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    platform: process.env.VERCEL ? "vercel" : "local",
  };

  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      driver,
      configured,
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
