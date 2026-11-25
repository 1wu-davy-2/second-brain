import { FilePlus2 } from "lucide-react";
import { NewNoteButton } from "@/components/notes/new-note-button";
import { Kbd } from "@/components/ui/kbd";

export function EmptyState({
  title,
  description,
  showCreate = true,
}: {
  title: string;
  description: string;
  showCreate?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-16 text-center">
      <div className="mb-3.5 flex size-10 items-center justify-center rounded-[5px] border border-border bg-muted/50 text-signal">
        <FilePlus2 className="size-4" />
      </div>
      <p className="font-reading text-[16px] font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {showCreate ? (
        <div className="mt-5 flex items-center gap-2">
          <NewNoteButton />
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            或按 <Kbd>⌘</Kbd>
            <Kbd>N</Kbd>
          </span>
        </div>
      ) : null}
    </div>
  );
}
