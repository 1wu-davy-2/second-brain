# 第二大脑 · Second Brain

轻量级个人知识库。记录、检索、关联三件事做好，其他都往后放。

界面走「纸墨工作台」方向：暖纸底 + 墨色字 + 陶土色单一强调；阅读区用衬线字体（Newsreader），功能区用 IBM Plex Sans；全局极细颗粒纸纹，无渐变、无多层阴影。参考 E-Ink / Paper 与 Nature Distilled 两套风格数据，浅色与夜读深色均由同一组语义 Token 驱动。

技术栈：**Next.js 15 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Neon Postgres · Auth.js v5**，部署目标 Vercel。

---

## 已实现

| 能力 | 说明 |
| --- | --- |
| 认证 | GitHub / Google OAuth；未配置凭证时可用「本地快捷登录」（仅非生产环境） |
| 笔记 | 新建 / 编辑 / 软删除 / 收藏 / 标题自动兜底 |
| 编辑器 | Markdown 源文 + 实时预览，编辑 / 分栏 / 预览三态，工具栏与快捷键 |
| 自动保存 | 防抖 1.2s，`⌘S` 立即保存，切标签页/关页面时兜底提交 |
| 双向链接 | 输入 `[[` 弹出笔记搜索，光标处插入；右栏显示反向链接与出链 |
| 标签 | 多对多，编辑器内即时增删/新建，侧边栏按标签筛选 |
| 搜索 | 标题 + 正文，标题命中优先；`⌘K` 命令面板 |
| 分享 | 生成只读短链 `/share/xxxx`，不泄露账号信息 |
| 导出 | Markdown（合并单文件）与 JSON，含标签 |
| 外观 | 浅色 / 深色 / 跟随系统，全站语义色 Token |
| 响应式 | 桌面优先，移动端抽屉式侧栏 |

快捷键：`⌘/Ctrl + K` 搜索 · `⌘/Ctrl + N` 新建 · `⌘/Ctrl + S` 保存 · `⌘/Ctrl + B` 加粗 · `⌘/Ctrl + I` 斜体 · `[[` 引用

---

## 本地启动

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000 ，点「本地快捷登录」即可。

**零配置**：没有 `DATABASE_URL` 时自动使用嵌入式 Postgres（PGlite），数据落在 `./.data/pgdata`，首次建库自动执行 `drizzle/` 下的迁移。首次登录会写入 3 篇示例笔记。

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 生产必填 | Neon 连接串。留空则用本地 PGlite |
| `AUTH_SECRET` | 生产必填 | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | 选填 | GitHub OAuth |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | 选填 | Google OAuth |
| `AUTH_DEV_LOGIN` | 选填 | 设为 `true` 可在生产启用本地快捷登录（不建议） |

OAuth 回调地址（本地 / 线上各配一份）：

- GitHub：`https://<域名>/api/auth/callback/github`
- Google：`https://<域名>/api/auth/callback/google`

## 数据库

```bash
pnpm db:generate   # 改完 lib/db/schema.ts 后生成迁移
pnpm db:migrate    # 对 DATABASE_URL 指向的库执行迁移（Neon）
pnpm db:studio     # 可视化查看
```

本地 PGlite 不需要手动迁移，开发态启动时自动执行。

## 部署到 Vercel

仓库：<https://github.com/1wu-davy-2/second-brain>

已内置的自动识别配置：

- `vercel.json` 显式声明 `framework: nextjs`，构建命令 `pnpm build`
- `package.json` 里 `packageManager: pnpm@11.21.0` + `engines.node >= 20.11`
- `pnpm-lock.yaml` 已提交，Vercel 用 `pnpm install --frozen-lockfile` 安装
- `.vercelignore` 排除 `.data / shots / .env.local`，不会把本地数据库打上去

步骤：

1. Vercel → Add New → Project → 选择 `1wu-davy-2/second-brain`，Framework 会自动识别为 Next.js，Root Directory 保持 `./
2. Settings → Environment Variables（Production 与 Preview 都加）：

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon 连接串（见 `.env.vercel.local`） |
   | `AUTH_SECRET` | 32 字节随机串（见 `.env.vercel.local`） |

3. Deploy。构建阶段不连数据库，所有页面都是动态渲染。
4. 部署完成后访问 `https://<域名>/api/health`，返回 `{"ok":true,"driver":"neon"}` 即数据库通了。
5. 数据库迁移只需在本地执行一次：`pnpm db:migrate`（已执行过则跳过）。

账号体系：内置账号密码登录（scrypt 哈希）与可选的 GitHub / Google OAuth。仓库公开，**默认管理员密码不写进仓库**，初始化方式：

```bash
# 在 .env.local 里设置 ADMIN_USERNAME / ADMIN_PASSWORD 后执行
pnpm db:seed-admin
```

同一个命令也用于重置密码：改 `ADMIN_PASSWORD` 再跑一次即可覆盖哈希。

> 连接串里的 `channel_binding=require` 是 libpq 参数，Neon serverless 驱动会在运行时自动忽略，保留不影响使用。

> Vercel 上若缺少 `DATABASE_URL`，服务仍能启动但会退回 PGlite（数据不持久），并打印警告。生产务必配置。
> 仓库是公开的，**不要**把连接串写进任何提交的文件；只放在 Vercel 环境变量和本地 `.env.local`。

## 目录

```
app/
  (auth)/login/          登录页
  (main)/                登录后区域（侧边栏外壳）
    notes/               列表 / 编辑器 / 新建跳转
    favorites|shared/    收藏、已分享
    tags/[id]/           按标签筛选
    search/              搜索结果页
    settings/            设置（主题、账号、导出）
  share/[slug]/          公开只读页
  api/                   auth / search / export
components/
  editor/                编辑器、工具栏、标签选择、链接补全、侧栏
  notes/                 列表项、空状态、排序、新建
  layout/                外壳、侧边栏、命令面板
  ui/                    按钮、输入、弹窗、菜单等原子组件
lib/
  db/                    schema 与双驱动（Neon / PGlite）
  notes/                 查询、Server Actions、链接解析
  markdown/              [[ ]] 解析与标题提取
  auth.ts                Auth.js 配置与登录态
drizzle/                 迁移 SQL
```

## 设计取舍

- **Markdown 源文编辑**而非富文本：数据永远是纯文本，导出零损耗；`[[` 补全 + 实时预览保留了所见即所得的便利。
- **不使用文件夹**：标签足够覆盖个人知识库的归类需求，少一层层级就少一次决策。
- **搜索用 ILIKE 而非 `to_tsvector`**：`simple` 词典不做中文分词，`ILIKE` 对中文反而更准；笔记量到万级再引入 `pg_trgm` 或向量检索。
- **软删除无回收站**：表里保留 `deleted_at`，但第一版没做恢复入口。
- **删除/改名会重算链接**：标题变更后，引用旧标题的笔记会自动重算，旧链接变为「缺失链接」——和 Obsidian 的行为一致。

## 下一步（按需）

- 回收站与恢复
- 未链接提及（正文提到标题但没写 `[[` 时提示）
- 图片上传（Vercel Blob）
- pgvector 语义搜索、AI 摘要
