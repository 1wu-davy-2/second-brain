import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 部署后自检：确认数据库可达，并返回当前驱动 */
export async function GET() {
  const driver = process.env.DATABASE_URL ? "neon" : "pglite";
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, driver, time: new Date().toISOString() });
  } catch (error) {
    console.error("[health] 数据库连接失败", error);
    return NextResponse.json(
      { ok: false, driver, error: "database_unreachable" },
      { status: 500 },
    );
  }
}
