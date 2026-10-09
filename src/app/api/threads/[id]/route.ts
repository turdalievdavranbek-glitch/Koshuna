import { sealChat } from "@/lib/chat";
import { readChat, sendChat } from "@/server/chat";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const result = await readChat(user.id, id);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat(result), 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<{ text?: string }>(req);
  const result = await sendChat(user.id, id, body?.text ?? "");
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat(result), 200, { "Cache-Control": "no-store" });
}
