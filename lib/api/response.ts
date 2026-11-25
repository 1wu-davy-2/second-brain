import { authenticateRequest, type ApiAuth } from "@/lib/api/auth";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
  });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** 统一的鉴权包装：未通过直接返回 401，通过则把 userId 交给处理函数 */
export async function withApiAuth(
  request: Request,
  handler: (auth: ApiAuth) => Promise<Response>,
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError(401, "unauthorized", "缺少或无效的 API 密钥（Authorization: Bearer <token>）");
  }
  try {
    return await handler(auth);
  } catch (error) {
    console.error("[api]", error);
    return apiError(500, "internal_error", "服务端处理失败");
  }
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
