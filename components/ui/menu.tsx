"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface MenuItemSpec {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  shortcut?: string;
}

interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItemSpec[];
  align?: "start" | "end";
  className?: string;
  contentClassName?: string;
  label?: string;
}

export function Menu({ trigger, items, align = "end", className, contentClassName }: MenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={cn(
            "animate-in-fast absolute top-[calc(100%+6px)] z-40 min-w-52 rounded-[var(--radius-md)] border border-border bg-popover p-1 shadow-paper",
            align === "end" ? "right-0" : "left-0",
            contentClassName,
          )}
        >
          {items.map((item) => (
            <React.Fragment key={item.label}>
              {item.separatorBefore ? <div className="my-1 h-px bg-border" /> : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-left text-[13px] transition-colors",
                  item.danger
                    ? "text-danger hover:bg-danger/10"
                    : "text-foreground hover:bg-accent",
                  item.disabled && "pointer-events-none opacity-40",
                )}
              >
                {item.icon ? <item.icon className="size-3.5 opacity-70" /> : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.shortcut ? (
                  <span className="text-[11px] text-muted-foreground">{item.shortcut}</span>
                ) : null}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
