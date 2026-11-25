import { authenticateRequest } from "@/lib/api/auth";
import {
  createNoteForApi,
  deleteNoteForApi,
  getNoteForApi,
  listTagsForApi,
  searchNotesForApi,
  updateNoteForApi,
} from "@/lib/api/notes-service";
import { CORS_HEADERS } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * 远程 MCP 端点（Streamable HTTP · 无状态）。
 * 客户端：Authorization: Bearer <API 密钥>，POST 本地址。
 */
const PROTOCOL_VERSION = "2025-06-18";

const SERVER_INFO = { name: "second-brain", version: "0.1.0" };

const INSTRUCTIONS = [
  "这是个人知识库「第二大脑」。",
  "create_note 用于把一段内容存成笔记，content 支持 Markdown，可用 [[笔记标题]] 建立双向链接。",
  "search_notes 用于查找已有笔记，get_note 读取全文，update_note 追加或改写。",
].join("");

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

const TOOLS = [
  {
    name: "create_note",
    description: "新建一篇笔记。content 支持 Markdown；tags 直接传标签名，不存在的会自动创建。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "标题，留空则为「无标题」" },
        content: { type: "string", description: "正文（Markdown）" },
        tags: { type: "array", items: { type: "string" }, description: "标签名列表" },
      },
      required: ["content"],
    },
  },
  {
    name: "search_notes",
    description: "按关键词搜索笔记标题与正文，返回摘要列表（不含全文）。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "关键词，留空则按更新时间列出" },
        tag: { type: "string", description: "按标签名过滤" },
        limit: { type: "integer", minimum: 1, maximum: 50, description: "返回条数，默认 10" },
      },
    },
  },
  {
    name: "get_note",
    description: "按 id 读取笔记全文。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "笔记 UUID" } },
      required: ["id"],
    },
  },
  {
    name: "update_note",
    description: "修改笔记的标题、正文或标签。只传需要改的字段。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "笔记 UUID" },
        title: { type: "string" },
        content: { type: "string", description: "新正文，会整体覆盖" },
        tags: { type: "array", items: { type: "string" }, description: "新标签列表，会整体覆盖" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_note",
    description: "软删除一篇笔记。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "笔记 UUID" } },
      required: ["id"],
    },
  },
  {
    name: "list_tags",
    description: "列出所有标签。",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textResult(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function callTool(userId: string, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "create_note": {
      if (typeof args.content !== "string") return errorResult("content 必须是字符串");
      const note = await createNoteForApi(userId, {
        title: typeof args.title === "string" ? args.title : undefined,
        content: args.content,
        tags: Array.isArray(args.tags) ? args.tags.filter((t): t is string => typeof t === "string") : undefined,
      });
      return textResult({ id: note.id, title: note.title, tags: note.tags, url: `/notes/${note.id}` });
    }
    case "search_notes": {
      const limit = typeof args.limit === "number" ? Math.min(Math.max(args.limit, 1), 50) : 10;
      const result = await searchNotesForApi(userId, {
        query: typeof args.query === "string" ? args.query : undefined,
        tag: typeof args.tag === "string" ? args.tag : undefined,
        limit,
      });
      return textResult(result);
    }
    case "get_note": {
      if (typeof args.id !== "string") return errorResult("id 必须是 UUID 字符串");
      const note = await getNoteForApi(userId, args.id);
      return note ? textResult(note) : errorResult("笔记不存在");
    }
    case "update_note": {
      if (typeof args.id !== "string") return errorResult("id 必须是 UUID 字符串");
      const note = await updateNoteForApi(userId, args.id, {
        title: typeof args.title === "string" ? args.title : undefined,
        content: typeof args.content === "string" ? args.content : undefined,
        tags: Array.isArray(args.tags) ? args.tags.filter((t): t is string => typeof t === "string") : undefined,
      });
      return note ? textResult(note) : errorResult("笔记不存在");
    }
    case "delete_note": {
      if (typeof args.id !== "string") return errorResult("id 必须是 UUID 字符串");
      const deleted = await deleteNoteForApi(userId, args.id);
      return textResult({ deleted, id: args.id });
    }
    case "list_tags": {
      return textResult({ tags: await listTagsForApi(userId) });
    }
    default:
      return null;
  }
}

async function handleMessage(userId: string, message: JsonRpcRequest) {
  const id = message.id ?? null;
  const method = message.method ?? "";
  const params = message.params ?? {};

  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION;
      return ok(id, {
        protocolVersion: requested === PROTOCOL_VERSION ? requested : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
      try {
        const result = await callTool(userId, name, args);
        if (!result) return fail(id, -32602, `未知的工具：${name}`);
        return ok(id, result);
      } catch (error) {
        console.error("[mcp] 工具执行失败", name, error);
        return ok(id, errorResult(error instanceof Error ? error.message : "工具执行失败"));
      }
    }
    default:
      return fail(id, -32601, `不支持的方法：${method || "(空)"}`);
  }
}

function unauthorized() {
  return new Response(
    JSON.stringify({ error: { code: "unauthorized", message: "缺少或无效的 API 密钥" } }),
    {
      status: 401,
      headers: { ...CORS_HEADERS, "WWW-Authenticate": "Bearer", "Content-Type": "application/json" },
    },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** 无状态实现，不提供服务端 SSE 推送 */
export function GET() {
  return new Response(
    JSON.stringify({ error: { code: "method_not_allowed", message: "该端点只接受 POST（无状态 MCP）" } }),
    {
      status: 405,
      headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS", "Content-Type": "application/json" },
    },
  );
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON 解析失败" } }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  const responses: unknown[] = [];
  for (const item of messages) {
    const message = item as JsonRpcRequest;
    if (!message || typeof message !== "object" || typeof message.method !== "string") {
      responses.push(fail(null, -32600, "无效的 JSON-RPC 请求"));
      continue;
    }
    const response = await handleMessage(auth.userId, message);
    if (response) responses.push(response);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify(Array.isArray(body) ? responses : responses[0]), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
    },
  });
}
