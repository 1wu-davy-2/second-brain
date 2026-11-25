"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";

const LABELS: Record<string, string> = {
  updated: "最近更新",
  created: "最近创建",
  title: "标题 A→Z",
};

export function SortMenu({ current, basePath }: { current: string; basePath: string }) {
  const router = useRouter();

  return (
    <Menu
      trigger={
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <ArrowUpDown className="size-3.5" />
          <span className="hidden sm:inline">{LABELS[current] ?? "排序"}</span>
        </Button>
      }
      items={(["updated", "created", "title"] as const).map((key) => ({
        label: LABELS[key],
        onSelect: () => router.push(`${basePath}?sort=${key}`),
      }))}
    />
  );
}
