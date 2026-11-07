import { getSessionUser } from "@/server/auth";
import { guardCsrf, json, readJson } from "@/server/http";
import { recordShopEvent } from "@/server/shop-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!id || id.length > 80) return json({ error: "not-found" }, 404);
  const body = await readJson<{ kind?: string; device?: string }>(req);
  const kind = body?.kind === "call" || body?.kind === "whatsapp" || body?.kind === "view" ? body.kind : null;
  if (!kind) return json({ error: "bad-json" }, 400);
  const viewer = await getSessionUser(req).catch(() => null);
  const result = await recordShopEvent(id, kind === "view" ? "shop_view" : kind, {
    userId: viewer?.id ?? null,
    device: body?.device,
  });
  if ("error" in result) return json({ error: result.error }, result.status);
  return json({ ok: true }, 200, { "Cache-Control": "no-store" });
}
