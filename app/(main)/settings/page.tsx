import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSection, ExportSection, ThemeSection } from "@/components/settings/settings-client";
import { currentUser } from "@/lib/auth";
import { countNotes, listTagsWithCounts } from "@/lib/notes/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "设置" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="paper-label px-1">{title}</h2>
      <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border bg-card shadow-paper">
        {children}
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [allCount, favoriteCount, sharedCount, tagRows] = await Promise.all([
    countNotes(user.id, "all"),
    countNotes(user.id, "favorites"),
    countNotes(user.id, "public"),
    listTagsWithCounts(user.id),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6">
          <h1 className="text-[15px] font-semibold text-foreground">设置</h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">外观、账号与数据管理</p>
        </header>

        <div className="flex flex-col gap-6">
          <Section title="外观">
            <ThemeSection />
          </Section>

          <Section title="账号">
            <AccountSection
              name={user.name ?? null}
              email={user.email ?? null}
              image={user.image ?? null}
            />
          </Section>

          <Section title="数据">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">笔记概览</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {allCount} 篇笔记 · {tagRows.length} 个标签 · 已分享 {sharedCount} 篇
                </p>
              </div>
              <p className="shrink-0 text-[11.5px] text-muted-foreground">收藏 {favoriteCount} 篇</p>
            </div>
            <ExportSection />
          </Section>

          <Section title="关于">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-[13px] text-foreground">版本</p>
              <p className="text-[11.5px] text-muted-foreground">v0.1.0</p>
            </div>
            <div className="px-4 py-3.5">
              <p className="font-reading text-[15px] font-semibold text-foreground">第二大脑</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Next.js 15 · Neon Postgres · Drizzle
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                未配置 DATABASE_URL 时数据保存在本地 PGlite；配置后写入云端 Postgres。
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
