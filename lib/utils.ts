import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 中英文混排字数：CJK 按字计，拉丁按词计 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g);
  const cjk = cjkMatches ? cjkMatches.length : 0;
  const latin = text
    .replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, " ")
    .match(/[A-Za-z0-9_'-]+/g);
  return cjk + (latin ? latin.length : 0);
}

/** 从 Markdown 原文提取纯文本摘要 */
export function buildExcerpt(markdown: string, length = 160): string {
  if (!markdown) return "";

  const blocks: string[] = [];
  let inCodeBlock = false;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const trimmed = line.trim();
    if (!trimmed) continue;
    // 表格行、分隔线、图片、HTML 注释对摘要没有价值
    if (trimmed.startsWith("|")) continue;
    if (/^[-*_]{3,}$/.test(trimmed)) continue;
    if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) continue;
    if (/^<!--/.test(trimmed)) continue;

    const cleaned = trimmed
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s?/, "")
      .replace(/^[-*+]\s+(\[[ xX]\]\s*)?/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/[*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned) blocks.push(cleaned);
  }

  const plain = blocks.join(" · ");
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

export function formatRelativeTime(date: Date | string | number): string {
  const value = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - value.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 2 * day) return "昨天";
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} 周前`;

  return value.toLocaleDateString("zh-CN", {
    year: value.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | number): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function randomSlug(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

/** 标题兜底：去掉换行、限长 */
export function normalizeTitle(title: string, fallback = "无标题"): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length === 0 ? fallback : clean.slice(0, 200);
}
