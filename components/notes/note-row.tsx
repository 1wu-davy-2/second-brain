import { Globe, Star } from "lucide-react";
import Link from "next/link";
import { TagChip } from "@/components/notes/tag-chip";
import type { NoteListItem } from "@/lib/notes/queries";
import { cn, formatRelativeTime } from "@/lib/utils";

export function NoteRow({ note, active }: { note: NoteListItem; active?: boolean }) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className={cn(
        "group relative flex flex-col gap-1 rounded-[var(--radius-md)] px-3 py-3 transition-colors",
        "hover:bg-accent/60",
        active && "bg-accent",
      )}
    >
      <div className="flex items-center gap-1.5">
        <h3 className="min-w-0 truncate font-reading text-[15px] font-semibold tracking-[-0.01em]">
          {note.title}
        </h3>
        {note.isFavorite ? (
          <Star className="size-3 shrink-0 fill-signal text-signal" />
        ) : null}
        {note.isPublic ? <Globe className="size-3 shrink-0 text-muted-foreground/60" /> : null}
      </div>

      <p className="line-clamp-2 font-reading text-[13px] leading-[1.65] text-muted-foreground">
        {note.excerpt || <span className="italic opacity-60">空笔记</span>}
      </p>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/70">
        {note.tags.map((tag) => (
          <TagChip key={tag.id} name={tag.name} color={tag.color} interactive={false} />
        ))}
        <span className="tabular-nums">{formatRelativeTime(note.updatedAt)}</span>
        <span className="text-border">·</span>
        <span className="tabular-nums">{note.wordCount} 字</span>
      </div>
    </Link>
  );
}
