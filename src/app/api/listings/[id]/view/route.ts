import { getSessionUser } from "@/server/auth";
import { guardCsrf, json, readJson } from "@/server/http";
import { recordView } from "@/server/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST {device?}: one view per viewer per listing per day, owner excluded. */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!id || id.length > 120) return json({ error: "not-found" }, 404);
  const viewer = await getSessionUser(req).catch(() => null);
  const body = await readJson<{ device?: string }>(req);
  const result = await recordView(id, { userId: viewer?.id ?? null, device: body?.device });
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result, 200, { "Cache-Control": "no-store" });
}
