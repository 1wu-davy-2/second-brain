import type { Metadata } from "next";
import { Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { CopyLinkButton } from "@/components/share/copy-link-button";
import { getPublicNote } from "@/lib/notes/queries";
import { buildExcerpt, formatDateTime, normalizeTitle } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicNote(slug);

  if (!data) return { title: "笔记不存在" };

  return {
    title: data.note.title,
    description: buildExcerpt(data.note.content, 120),
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const data = await getPublicNote(slug);

  if (!data) notFound();

  const { note, authorName } = data;
  const title = normalizeTitle(note.title);
  const metaItems = [
    authorName ?? "匿名作者",
    `更新于 ${formatDateTime(note.updatedAt)}`,
    `${note.wordCount} 字`,
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 h-12 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md transition-opacity duration-150 hover:opacity-80"
          >
            <span className="flex size-[22px] items-center justify-center rounded-[5px] bg-primary text-signal shadow-paper">
              <Zap className="size-3" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="font-reading text-[13.5px] font-semibold tracking-tight">第二大脑</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="hidden text-[12px] text-muted-foreground sm:inline">只读分享</span>
            <CopyLinkButton />
          </div>
        </div>
      </header>

      <article className="mx-auto w-full max-w-[720px] px-5 py-12 md:py-16">
        <h1 className="font-reading text-[32px] font-semibold leading-tight tracking-tight text-foreground md:text-[36px]">
          {title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] tabular-nums text-muted-foreground">
          {metaItems.map((item, index) => (
            <span key={item} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden className="text-border">
                  ·
                </span>
              ) : null}
              <span>{item}</span>
            </span>
          ))}
        </div>

        <div className="relative mb-8 mt-6">
          <div className="h-px w-full bg-border" />
          <div className="absolute bottom-0 left-0 h-0.5 w-8 bg-signal" />
        </div>

        <MarkdownPreview content={note.content} refs={[]} wikiFallback="text" />

        <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-[12px] text-muted-foreground">
          <span>由第二大脑生成</span>
          <span className="flex items-center gap-1">
            也想记录？
            <Link href="/" className="text-link transition-opacity duration-150 hover:opacity-80">
              打开应用
            </Link>
          </span>
        </div>
      </article>
    </div>
  );
}
