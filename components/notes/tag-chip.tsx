import Link from "next/link";
import { cn } from "@/lib/utils";

export function TagChip({
  id,
  name,
  color,
  interactive = true,
  className,
}: {
  id?: string;
  name: string;
  color?: string | null;
  interactive?: boolean;
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "inline-flex h-[19px] items-center gap-1.5 rounded-[4px] border border-border bg-muted/60 px-1.5 text-[10.5px] font-medium leading-none text-muted-foreground transition-colors",
        interactive && "hover:border-signal/40 hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <span
        className="size-[5px] rounded-full"
        style={{ backgroundColor: color ?? "var(--signal)" }}
      />
      {name}
    </span>
  );

  if (!interactive || !id) return content;
  return <Link href={`/tags/${id}`}>{content}</Link>;
}
