import { cn } from "@/lib/utils";

export function Avatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase();
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? "用户头像"}
        className={cn("size-7 rounded-full border border-border object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground",
        className,
      )}
    >
      {initial}
    </span>
  );
}
