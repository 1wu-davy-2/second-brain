"use client";

import {
  FileText,
  Globe,
  Hash,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { signOutAction } from "@/lib/auth-actions";
import { createTag } from "@/lib/notes/actions";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: { name: string | null; email: string | null; image: string | null };
  counts: { all: number; favorites: number; public: number };
  tags: { id: string; name: string; color: string | null; count: number }[];
  onOpenSearch: () => void;
  onCreate: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ user, counts, tags, onOpenSearch, onCreate, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [tagName, setTagName] = React.useState("");
  const [savingTag, setSavingTag] = React.useState(false);

  const handleCreateTag = async () => {
    if (!tagName.trim() || savingTag) return;
    setSavingTag(true);
    const result = await createTag(tagName);
    setSavingTag(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTagName("");
    setTagModalOpen(false);
    toast.success(`标签「${result.data.name}」已创建`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-2 pt-3.5">
        <Link
          href="/notes"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-opacity hover:opacity-80"
        >
          <span className="flex size-[22px] items-center justify-center rounded-[5px] bg-primary text-signal shadow-paper">
            <Zap className="size-3" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="font-reading text-[14px] font-semibold tracking-tight">第二大脑</span>
        </Link>

        <button
          type="button"
          onClick={onOpenSearch}
          className="mt-3 flex h-[34px] w-full items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-signal/40 hover:bg-accent"
        >
          <Search className="size-3.5 opacity-70" />
          <span className="flex-1 text-left">搜索笔记</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav className="mt-1 space-y-0.5 px-2">
        <NavItem
          href="/notes"
          icon={FileText}
          label="全部笔记"
          count={counts.all}
          active={pathname === "/notes" || /^\/notes\/[^/]+$/.test(pathname)}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/favorites"
          icon={Star}
          label="收藏"
          count={counts.favorites}
          active={pathname === "/favorites"}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/shared"
          icon={Globe}
          label="已分享"
          count={counts.public}
          active={pathname === "/shared"}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-2">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="paper-label">标签</span>
          <button
            type="button"
            onClick={() => setTagModalOpen(true)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="新建标签"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
          {tags.length === 0 ? (
            <p className="px-2 py-1.5 text-[12px] leading-relaxed text-muted-foreground/70">
              还没有标签。给笔记打标签，比建文件夹轻。
            </p>
          ) : (
            tags.map((tag) => {
              const active = pathname === `/tags/${tag.id}`;
              return (
                <Link
                  key={tag.id}
                  href={`/tags/${tag.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "group flex h-[30px] items-center gap-2 rounded-[5px] px-2 text-[13px] transition-colors",
                    active
                      ? "bg-accent font-medium text-foreground shadow-[inset_2px_0_0_var(--signal)]"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  <span
                    className="size-[6px] shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color ?? "var(--signal)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/60">
                    {tag.count}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 rounded-[7px] px-1.5 py-1.5">
          <Avatar name={user.name} image={user.image} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium leading-tight">{user.name ?? "未命名"}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {user.email ?? "本地账号"}
            </p>
          </div>
          <ThemeQuickToggle />
          <Menu
            trigger={
              <button
                type="button"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="账号菜单"
              >
                <Settings className="size-3.5" />
              </button>
            }
            items={[
              {
                label: "新建笔记",
                icon: Plus,
                onSelect: onCreate,
                shortcut: "⌘N",
              },
              {
                label: "设置",
                icon: Settings,
                onSelect: () => router.push("/settings"),
                separatorBefore: true,
              },
              {
                label: "退出登录",
                icon: LogOut,
                danger: true,
                onSelect: () => {
                  void signOutAction();
                },
              },
            ]}
          />
        </div>
      </div>

      <Modal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title="新建标签"
        description="标签用于跨笔记归类，可以给一篇笔记加多个。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTagModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTag} disabled={!tagName.trim() || savingTag}>
              {savingTag ? "创建中…" : "创建"}
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleCreateTag();
          }}
          placeholder="例如：读书笔记"
          maxLength={30}
        />
      </Modal>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  count,
  active,
  onNavigate,
}: {
  href: string;
  icon: typeof Hash;
  label: string;
  count: number;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex h-[30px] items-center gap-2 rounded-[5px] px-2 text-[13px] transition-colors",
        active
          ? "bg-accent font-medium text-foreground shadow-[inset_2px_0_0_var(--signal)]"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-3.5", active ? "text-signal" : "opacity-70")} />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 ? (
        <span className="text-[11px] tabular-nums text-muted-foreground/60">{count}</span>
      ) : null}
    </Link>
  );
}

function ThemeQuickToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label={isDark ? "切换到浅色" : "切换到深色"}
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}
