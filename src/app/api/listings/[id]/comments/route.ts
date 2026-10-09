import { addComment, listComments } from "@/server/comments";
import { getSessionUser } from "@/server/auth";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Guests can read; signed-in viewers also get their likes and hide people they blocked. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser(req).catch(() => null);
  const result = await listComments(id, viewer?.id ?? null);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<{ text?: string; parentId?: string }>(req);
  const result = await addComment(user.id, id, body?.text, body?.parentId);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result, 201, { "Cache-Control": "no-store" });
}
