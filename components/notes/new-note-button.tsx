"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createNote } from "@/lib/notes/actions";
import { cn } from "@/lib/utils";

export function NewNoteButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await createNote({});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/notes/${result.data.id}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button onClick={handleClick} size="sm" className={cn("gap-1.5", className)} disabled={pending}>
      <Plus className="size-3.5" />
      新建笔记
    </Button>
  );
}
