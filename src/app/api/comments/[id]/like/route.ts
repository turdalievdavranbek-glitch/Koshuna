import { toggleCommentLike } from "@/server/comments";
import { guardCsrf, json, requireUser } from "@/server/http";
import { limitOr429 } from "@/server/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Like / unlike a comment. */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = limitOr429(`clike:${user.id}`, 60, 60_000);
  if (limited) return limited;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "not-found" }, 404);
  const result = await toggleCommentLike(user.id, id);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result);
}
