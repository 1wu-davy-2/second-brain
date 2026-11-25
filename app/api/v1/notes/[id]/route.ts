import { z } from "zod";
import {
  deleteNoteForApi,
  getNoteForApi,
  updateNoteForApi,
} from "@/lib/api/notes-service";
import { apiError, json, preflight, readJson, withApiAuth } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    title: z.string().max(200).optional(),
    content: z.string().max(200_000).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.content !== undefined || value.tags !== undefined,
    { message: "至少要提供 title / content / tags 之一" },
  );

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/notes/:id */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiAuth(request, async ({ userId }) => {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return apiError(400, "invalid_id", "id 必须是 UUID");

    const note = await getNoteForApi(userId, id);
    if (!note) return apiError(404, "not_found", "笔记不存在");
    return json({ note });
  });
}

/** PATCH /api/v1/notes/:id */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiAuth(request, async ({ userId }) => {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return apiError(400, "invalid_id", "id 必须是 UUID");

    const body = await readJson<unknown>(request);
    const parsed = patchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiError(422, "invalid_body", parsed.error.issues[0]?.message ?? "参数不合法");
    }

    const note = await updateNoteForApi(userId, id, parsed.data);
    if (!note) return apiError(404, "not_found", "笔记不存在");
    return json({ note });
  });
}

/** DELETE /api/v1/notes/:id —— 软删除 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiAuth(request, async ({ userId }) => {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return apiError(400, "invalid_id", "id 必须是 UUID");

    const deleted = await deleteNoteForApi(userId, id);
    if (!deleted) return apiError(404, "not_found", "笔记不存在");
    return json({ deleted: true, id });
  });
}
