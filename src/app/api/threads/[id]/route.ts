import { sealChat } from "@/lib/chat";
import { readChat, sendChat } from "@/server/chat";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";
import { limitOr429 } from "@/server/rate-limit";

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
  const limited = limitOr429(`msg-min:${user.id}`, 30, 60_000) ?? limitOr429(`msg-hour:${user.id}`, 400, 3_600_000);
  if (limited) return limited;
  const { id } = await ctx.params;
  const body = await readJson<{ text?: string }>(req);
  const result = await sendChat(user.id, id, body?.text ?? "");
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat(result), 200, { "Cache-Control": "no-store" });
}
