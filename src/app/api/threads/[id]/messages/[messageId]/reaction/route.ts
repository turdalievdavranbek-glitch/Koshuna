import { setMessageReaction } from "@/server/chat";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { limitOr429 } from "@/server/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Set, change or remove (same emoji / null) this user's reaction on a chat message. */
export async function PUT(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  // Same budget as listing likes/reactions.
  const limited = limitOr429(`react:${user.id}`, 60, 60_000) ?? limitOr429(`react-hour:${user.id}`, 600, 3_600_000);
  if (limited) return limited;
  const { id, messageId } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(messageId)) return json({ error: "not-found" }, 404);
  const body = await readJson<{ emoji?: string | null }>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const result = await setMessageReaction(user.id, id, messageId, typeof body.emoji === "string" ? body.emoji : null);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result, 200, { "Cache-Control": "no-store" });
}
