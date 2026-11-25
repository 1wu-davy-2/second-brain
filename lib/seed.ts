import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { noteLinks, notes, noteTags, tags } from "@/lib/db/schema";
import { countWords } from "@/lib/utils";

const WELCOME = `## 这是你的第二大脑

一个放想法、资料、半成品的地方。三个动作就够用了：

- **记录** — 按 \`⌘/Ctrl + N\` 新建，停下来 1.2 秒自动保存
- **检索** — 按 \`⌘/Ctrl + K\` 打开命令面板，搜索标题和正文
- **关联** — 输入 \`[[\` 引用另一篇笔记，被引用的那篇会自动出现反向链接

## 从哪开始

1. 把这页改成你自己的话，删掉不想看的
2. 建一篇「今天要做的三件事」，不要建文件夹，用标签
3. 读一遍 [[Markdown 速查]]，够用就行，不用背

## 写作习惯

> 记笔记的成本要低到接近零，否则你不会记。

碎片想法先写下来，白天不整理。晚上过一遍，把相关的串成一篇，串的过程就是思考。

相关：[[双向链接怎么用]]`;

const MARKDOWN_CHEATSHEET = `## 基础

| 想要 | 输入 |
| --- | --- |
| 标题 | \`# 一级\` ~ \`###### 六级\` |
| 加粗 / 斜体 | \`**粗**\` / \`*斜*\` |
| 删除线 | \`~~删掉~~\` |
| 行内代码 | \`\\\`code\\\`\` |
| 链接 | \`[文字](https://example.com)\` |
| 引用 | \`> 引用\` |
| 分割线 | \`---\` |

## 列表

\`\`\`markdown
- 无序
- 列表

1. 有序
2. 列表

- [ ] 待办
- [x] 已完成
\`\`\`

## 代码块

用三个反引号包起来，可以在反引号后标注语言：

\`\`\`ts
export function hello(name: string) {
  return \`你好，\${name}\`;
}
\`\`\`

## 双向链接

\`[[笔记标题]]\` 会跳转到那篇笔记；\`[[笔记标题|显示文字]]\` 可以改显示文字。

回到 [[欢迎来到第二大脑]]。`;

const WIKI_LINKS = `## 为什么要双向

单向链接只能从 A 走到 B。双向链接让 B 知道「谁提到了我」，于是知识开始自己长。

## 怎么用

在任意笔记里输入两个左方括号 \`[[\`，会弹出笔记搜索框，选中即插入。

- 目标存在 → 渲染成可点击链接
- 目标不存在 → 显示为虚线，点一下直接新建并带上标题

这正是「先写下来，回头再补」的工作方式。

## 反向链接

打开一篇笔记，右侧面板会列出所有引用它的笔记。这是发现「我原来在三个地方想过同一个问题」的唯一有效方式。

## 命名建议

链接靠标题匹配，所以标题要稳定、可辨认：

- ✅ 「读书笔记 · 认知觉醒」
- ❌ 「笔记1」

开始写吧 → [[欢迎来到第二大脑]]`;

const SEED_TAGS = [
  { name: "入门", color: "#6366f1" },
  { name: "参考", color: "#0ea5e9" },
  { name: "方法论", color: "#10b981" },
];

/**
 * 新用户首次登录时写入示例内容。失败不影响登录。
 */
export async function seedWorkspace(userId: string) {
  try {
    const db = await getDb();
    const existing = await db
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.userId, userId))
      .limit(1);
    if (existing.length > 0) return;

    const insertedTags = await db
      .insert(tags)
      .values(SEED_TAGS.map((tag) => ({ userId, name: tag.name, color: tag.color })))
      .onConflictDoNothing()
      .returning({ id: tags.id, name: tags.name });

    const tagId = (name: string) => insertedTags.find((tag) => tag.name === name)?.id;

    const insertedNotes = await db
      .insert(notes)
      .values([
        {
          userId,
          title: "欢迎来到第二大脑",
          content: WELCOME,
          wordCount: countWords(WELCOME),
          isFavorite: true,
        },
        {
          userId,
          title: "Markdown 速查",
          content: MARKDOWN_CHEATSHEET,
          wordCount: countWords(MARKDOWN_CHEATSHEET),
        },
        {
          userId,
          title: "双向链接怎么用",
          content: WIKI_LINKS,
          wordCount: countWords(WIKI_LINKS),
        },
      ])
      .returning({ id: notes.id, title: notes.title });

    const byTitle = new Map(insertedNotes.map((note) => [note.title, note.id]));

    const tagBindings: { noteId: string; tagId: string }[] = [];
    const bind = (title: string, tagName: string) => {
      const noteId = byTitle.get(title);
      const id = tagId(tagName);
      if (noteId && id) tagBindings.push({ noteId, tagId: id });
    };
    bind("欢迎来到第二大脑", "入门");
    bind("Markdown 速查", "入门");
    bind("Markdown 速查", "参考");
    bind("双向链接怎么用", "方法论");

    if (tagBindings.length > 0) {
      await db.insert(noteTags).values(tagBindings).onConflictDoNothing();
    }

    const welcome = byTitle.get("欢迎来到第二大脑");
    const cheatsheet = byTitle.get("Markdown 速查");
    const wiki = byTitle.get("双向链接怎么用");
    const linkRows: { sourceNoteId: string; targetNoteId: string }[] = [];
    if (welcome && cheatsheet) linkRows.push({ sourceNoteId: welcome, targetNoteId: cheatsheet });
    if (welcome && wiki) linkRows.push({ sourceNoteId: welcome, targetNoteId: wiki });
    if (cheatsheet && welcome) linkRows.push({ sourceNoteId: cheatsheet, targetNoteId: welcome });
    if (wiki && welcome) linkRows.push({ sourceNoteId: wiki, targetNoteId: welcome });

    if (linkRows.length > 0) {
      await db.insert(noteLinks).values(linkRows).onConflictDoNothing();
    }
  } catch (error) {
    console.error("[seed] 初始化示例内容失败", error);
  }
}
