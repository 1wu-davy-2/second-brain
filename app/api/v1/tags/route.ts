import { listTagsForApi } from "@/lib/api/notes-service";
import { json, preflight, withApiAuth } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/tags */
export async function GET(request: Request) {
  return withApiAuth(request, async ({ userId }) => {
    const tags = await listTagsForApi(userId);
    return json({ tags });
  });
}
