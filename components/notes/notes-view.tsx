import { NewNoteButton } from "@/components/notes/new-note-button";
import { NoteRow } from "@/components/notes/note-row";
import { SortMenu } from "@/components/notes/sort-menu";
import type { NoteListItem } from "@/lib/notes/queries";

interface NotesViewProps {
  title: string;
  subtitle: string;
  notes: NoteListItem[];
  sort: string;
  basePath: string;
  empty: React.ReactNode;
}

export function NotesView({ title, subtitle, notes, sort, basePath, empty }: NotesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/70 px-4 py-3.5 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-reading text-[19px] font-semibold tracking-tight">{title}</h1>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SortMenu current={sort} basePath={basePath} />
            <NewNoteButton className="ml-0.5" />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-3 py-3 md:px-6 md:py-4">
          {notes.length === 0 ? (
            empty
          ) : (
            <div className="divide-y divide-border/60">
              {notes.map((note) => (
                <NoteRow key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
