"use client";

import { Menu, Plus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { createNote } from "@/lib/notes/actions";

interface AppShellProps {
  user: { name: string | null; email: string | null; image: string | null };
  counts: { all: number; favorites: number; public: number };
  tags: { id: string; name: string; color: string | null; count: number }[];
  recent: { id: string; title: string }[];
  children: React.ReactNode;
}

export function AppShell({ user, counts, tags, recent, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  // 笔记详情页自带顶栏，移动端不再叠加全局头
  const isEditor = /^\/notes\/[^/]+$/.test(pathname);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const createAndOpen = React.useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const result = await createNote({});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/notes/${result.data.id}`);
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (key === "n" && !event.shiftKey) {
        event.preventDefault();
        void createAndOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createAndOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <Sidebar
          user={user}
          counts={counts}
          tags={tags}
          onOpenSearch={() => setPaletteOpen(true)}
          onCreate={createAndOpen}
        />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="animate-in-fast relative flex h-full w-[282px] flex-col border-r border-border bg-sidebar shadow-2xl">
            <Sidebar
              user={user}
              counts={counts}
              tags={tags}
              onOpenSearch={() => {
                setDrawerOpen(false);
                setPaletteOpen(true);
              }}
              onCreate={createAndOpen}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {isEditor ? null : (
          <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-2 md:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)} aria-label="打开菜单">
              <Menu />
            </Button>
            <span className="flex-1 truncate px-1 text-[13px] font-medium">第二大脑</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setPaletteOpen(true)} aria-label="搜索">
              <Search />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={createAndOpen} aria-label="新建笔记">
              <Plus />
            </Button>
          </header>
        )}

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        recent={recent}
        onCreate={createAndOpen}
      />
    </div>
  );
}
