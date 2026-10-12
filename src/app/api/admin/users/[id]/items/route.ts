import { NextResponse } from "next/server";
import { isDbUserId } from "@/lib/phone";
import { sessionIsAdmin } from "@/server/auth";
import { json, requireUser } from "@/server/http";
import { accountItemsForAdmin } from "@/server/masters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Admin only: one account with all its points and listings (any status except moderation-hidden). */
export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "not-found" }, 404);
  const data = await accountItemsForAdmin(id);
  if (!data) return json({ error: "not-found" }, 404);
  return json(data, 200, { "Cache-Control": "no-store" });
}
