import { sealChat } from "@/lib/chat";
import { openListingChat } from "@/server/chat";
import { guardCsrf, json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const result = await openListingChat(user.id, id);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat({ id: result.id }), 200, { "Cache-Control": "no-store" });
}
