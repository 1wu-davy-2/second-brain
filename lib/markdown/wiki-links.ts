/**
 * 双向链接语法：[[标题]] 或 [[标题|显示文本]]
 */
const WIKI_LINK_PATTERN = /\[\[([^\[\]|]{1,200})(?:\|([^\[\]]{1,200}))?\]\]/g;

export function extractWikiLinkTargets(markdown: string): string[] {
  const targets = new Set<string>();
  for (const match of markdown.matchAll(WIKI_LINK_PATTERN)) {
    const target = match[1]?.trim();
    if (target) targets.add(target);
  }
  return [...targets];
}

export interface NoteRef {
  id: string;
  title: string;
}

/**
 * 把 [[标题]] 转成标准 Markdown 链接，交给 react-markdown 渲染。
 * 已存在 -> /notes/:id
 * 不存在 -> fallback="create" 时指向新建页（边写边建）；fallback="text" 时退化为纯文本（公开页）
 */
export function resolveWikiLinks(
  markdown: string,
  refs: NoteRef[],
  fallback: "create" | "text" = "create",
): string {
  if (!markdown.includes("[[")) return markdown;

  const index = new Map(refs.map((ref) => [ref.title.trim().toLowerCase(), ref.id]));

  return markdown.replace(WIKI_LINK_PATTERN, (_match, rawTarget: string, rawAlias?: string) => {
    const target = rawTarget.trim();
    const label = (rawAlias ?? target).trim().replace(/[[\]]/g, "");
    const id = index.get(target.toLowerCase());
    if (id) {
      return `[${label}](/notes/${id} "wiki-link")`;
    }
    if (fallback === "text") {
      return label;
    }
    return `[${label}](/notes/new?title=${encodeURIComponent(target)} "wiki-link-missing")`;
  });
}

/** 从 Markdown 提取 #一级标题 用于大纲 */
export function extractHeadings(markdown: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  let inCodeBlock = false;
  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const match = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = match[2].replace(/[*_`~]/g, "").trim();
      headings.push({
        level: match[1].length,
        text,
        id: `h-${headings.length}`,
      });
    }
  }
  return headings;
}
