"use client";

import { Download, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const;

export function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">外观主题</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">选择界面配色，或跟随系统自动切换</p>
      </div>
      <div
        role="group"
        aria-label="主题模式"
        className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-1"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = mounted && theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "bg-background text-foreground shadow-paper"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EXPORT_OPTIONS = [
  {
    format: "md",
    title: "导出为 Markdown",
    description: "全部笔记合并为一个 .md 文件，便于迁移到 Obsidian、Logseq 等工具",
  },
  {
    format: "json",
    title: "导出为 JSON",
    description: "包含标题、正文、标签及收藏 / 分享状态的结构化数据",
  },
] as const;

export function ExportSection() {
  return (
    <>
      {EXPORT_OPTIONS.map((option) => (
        <div
          key={option.format}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">{option.title}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{option.description}</p>
          </div>
          <a
            href={`/api/export?format=${option.format}`}
            download
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          >
            <Download className="size-3.5" />
            下载
          </a>
        </div>
      ))}
      <div className="px-4 py-2.5">
        <p className="text-[11.5px] text-muted-foreground">导出包含全部未删除笔记及其标签。</p>
      </div>
    </>
  );
}

export function AccountSection({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} image={image} className="size-8 text-[12px]" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{name ?? "未命名用户"}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{email ?? "未绑定邮箱"}</p>
          </div>
        </div>
        <form action={signOutAction} className="shrink-0">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="size-3.5" />
            退出登录
          </Button>
        </form>
      </div>
      <div className="px-4 py-2.5">
        <p className="text-[11.5px] text-muted-foreground">通过 OAuth 或本地账号登录。</p>
      </div>
    </>
  );
}
