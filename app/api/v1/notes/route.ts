import { z } from "zod";
import { createNoteForApi, searchNotesForApi } from "@/lib/api/notes-service";
import { apiError, json, preflight, readJson, withApiAuth } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(200_000).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

export function OPTIONS() {
  return preflight();
}

/** POST /api/v1/notes —— 新建笔记 */
export async function POST(request: Request) {
  return withApiAuth(request, async ({ userId }) => {
    const body = await readJson<unknown>(request);
    const parsed = createSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiError(422, "invalid_body", parsed.error.issues[0]?.message ?? "参数不合法");
    }

    const note = await createNoteForApi(userId, parsed.data);
    return json({ note }, 201);
  });
}

/** GET /api/v1/notes?q=&tag=&limit=&offset= —— 列出 / 搜索 */
export async function GET(request: Request) {
  return withApiAuth(request, async ({ userId }) => {
    const params = new URL(request.url).searchParams;
    const limit = Number.parseInt(params.get("limit") ?? "20", 10);
    const offset = Number.parseInt(params.get("offset") ?? "0", 10);

    const result = await searchNotesForApi(userId, {
      query: params.get("q") ?? undefined,
      tag: params.get("tag") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return json(result);
  });
}
