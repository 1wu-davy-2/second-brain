# 外部访问：REST API 与 MCP

两种方式，认证都用同一套 **API 密钥**（`Authorization: Bearer sb_live_...`），密钥存在数据库里，创建/吊销后立即生效，不需要重新部署。

## 1. 创建密钥

```bash
pnpm api:key create my-laptop    # 明文只打印一次，务必存好
pnpm api:key list                # 查看已有密钥（不显示明文）
pnpm api:key revoke <key-id>     # 吊销
```

数据库只保存 `sha256(token)`，服务端无法反推明文。

## 2. REST API

Base URL：`https://<你的域名>/api/v1`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/notes` | 新建笔记 |
| `GET` | `/notes?q=&tag=&limit=&offset=` | 搜索 / 列出（不含全文） |
| `GET` | `/notes/:id` | 笔记详情（含全文） |
| `PATCH` | `/notes/:id` | 修改标题 / 正文 / 标签 |
| `DELETE` | `/notes/:id` | 软删除 |
| `GET` | `/tags` | 标签列表 |
| `GET` | `/me` | 校验密钥并返回归属账号 |

### 新建笔记

```bash
curl -X POST https://<域名>/api/v1/notes \
  -H "Authorization: Bearer $SB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "随手记",
    "content": "正文支持 Markdown，可以用 [[另一篇笔记]] 建链接。",
    "tags": ["灵感", "待整理"]
  }'
```

`tags` 直接传标签名，不存在的标签会自动创建。

响应 `201`：

```json
{
  "note": {
    "id": "0f3c…",
    "title": "随手记",
    "content": "…",
    "tags": ["灵感", "待整理"],
    "isFavorite": false,
    "isPublic": false,
    "wordCount": 24,
    "createdAt": "2026-11-25T11:30:00.000Z",
    "updatedAt": "2026-11-25T11:30:00.000Z"
  }
}
```

### 搜索

```bash
curl -H "Authorization: Bearer $SB_TOKEN" \
  "https://<域名>/api/v1/notes?q=双向链接&limit=5"
```

```json
{ "total": 1, "notes": [ { "id": "…", "title": "…", "excerpt": "…", "tags": ["…"] } ] }
```

### 错误格式

```json
{ "error": { "code": "unauthorized", "message": "缺少或无效的 API 密钥（Authorization: Bearer <token>）" } }
```

状态码：`401` 未授权 · `404` 不存在 · `422` 参数不合法 · `500` 服务端错误。
所有 `/api/v1/*` 都带 `Access-Control-Allow-Origin: *`，浏览器直连也能用（注意不要把 token 写进前端）。

## 3. MCP 服务

端点：`https://<域名>/api/mcp`（Streamable HTTP，无状态）

### 客户端配置

Claude Desktop（支持远程 MCP 的版本）/ 通用客户端：

```json
{
  "mcpServers": {
    "second-brain": {
      "url": "https://<域名>/api/mcp",
      "headers": { "Authorization": "Bearer sb_live_..." }
    }
  }
}
```

Cursor（`~/.cursor/mcp.json`）用同样的结构。

### 可用工具

| 工具 | 参数 | 说明 |
| --- | --- | --- |
| `create_note` | `content`（必填）、`title`、`tags[]` | 新建笔记 |
| `search_notes` | `query`、`tag`、`limit` | 搜索，返回摘要 |
| `get_note` | `id` | 读取全文 |
| `update_note` | `id`、`title?`、`content?`、`tags?` | 局部更新 |
| `delete_note` | `id` | 软删除 |
| `list_tags` | — | 标签列表 |

### 手测

```bash
curl -X POST https://<域名>/api/mcp \
  -H "Authorization: Bearer $SB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

协议说明：无状态实现，不提供服务端 SSE 推送，因此 `GET /api/mcp` 返回 `405`；支持 JSON-RPC 批量请求。

## 4. 安全建议

- 一个用途一把密钥（笔记本、手机快捷指令、MCP 客户端分开），泄露时只吊销那一把
- 密钥等同账号写入权限，不要提交到仓库、不要硬编码进前端
- 定期 `pnpm api:key list` 看 `lastUsedAt`，长期不用就吊销
