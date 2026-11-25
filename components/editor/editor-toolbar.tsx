"use client";

import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  PenLine,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ToolbarCommand =
  | "h1"
  | "h2"
  | "bold"
  | "italic"
  | "code"
  | "quote"
  | "ul"
  | "ol"
  | "task"
  | "link"
  | "divider";

export type EditorMode = "write" | "split" | "preview";

const COMMANDS: { command: ToolbarCommand; icon: typeof Bold; label: string }[] = [
  { command: "h1", icon: Heading1, label: "标题 1" },
  { command: "h2", icon: Heading2, label: "标题 2" },
  { command: "bold", icon: Bold, label: "加粗 ⌘B" },
  { command: "italic", icon: Italic, label: "斜体 ⌘I" },
  { command: "code", icon: Code, label: "行内代码" },
  { command: "quote", icon: Quote, label: "引用" },
  { command: "ul", icon: List, label: "无序列表" },
  { command: "ol", icon: ListOrdered, label: "有序列表" },
  { command: "task", icon: ListTodo, label: "待办" },
  { command: "link", icon: LinkIcon, label: "链接" },
  { command: "divider", icon: Minus, label: "分割线" },
];

const MODES: { mode: EditorMode; icon: typeof PenLine; label: string }[] = [
  { mode: "write", icon: PenLine, label: "编辑" },
  { mode: "split", icon: Columns2, label: "分栏" },
  { mode: "preview", icon: Eye, label: "预览" },
];

export function EditorToolbar({
  mode,
  onModeChange,
  onCommand,
  disabled,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onCommand: (command: ToolbarCommand) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-border px-2 md:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
        {COMMANDS.map(({ command, icon: Icon, label }) => (
          <Button
            key={command}
            variant="ghost"
            size="icon-sm"
            title={label}
            aria-label={label}
            disabled={disabled || mode === "preview"}
            onClick={() => onCommand(command)}
            className="text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97]"
          >
            <Icon />
          </Button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {MODES.map(({ mode: value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onModeChange(value)}
            className={cn(
              "flex h-8 items-center gap-1 border-b px-1.5 text-[11px] transition-colors duration-150",
              mode === value
                ? "border-signal text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
              value === "split" && "hidden lg:flex",
            )}
          >
            <Icon className={cn("size-3.5", mode === value && "text-signal")} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
