import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { searchNotes } from "@/lib/notes/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (!query.trim()) {
    return NextResponse.json({ items: [] });
  }

  const items = await searchNotes(user.id, query, 10);
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}
