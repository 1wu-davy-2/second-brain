/**
 * Vercel 的 Neon 集成会把 `DATABASE_URL` 变成只读变量，想指向自己的库时无法直接改。
 * 约定：`DATABASE_URL_OVERRIDE` 优先，其次才是 `DATABASE_URL`。
 */
export function resolveDatabaseUrl(): string | undefined {
  const override = process.env.DATABASE_URL_OVERRIDE?.trim();
  if (override) return override;
  const url = process.env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

/** 去掉 libpq 专用参数（channel_binding 会干扰 Neon serverless 驱动） */
export function normalizeDatabaseUrl(url: string): string {
  return url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace(/[?&]$/, "")
    .replace("?&", "?");
}
