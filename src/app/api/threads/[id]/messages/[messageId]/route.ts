import { sealChat } from "@/lib/chat";
import { deleteChatMessage, editChatMessage } from "@/server/chat";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sender edits own text. */
export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id, messageId } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(messageId)) return json({ error: "not-found" }, 404);
  const body = await readJson<{ text?: string }>(req);
  const result = await editChatMessage(user.id, id, messageId, body?.text ?? "");
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat(result), 200, { "Cache-Control": "no-store" });
}

/** Sender deletes own message for both people (soft delete). */
export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id, messageId } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(messageId)) return json({ error: "not-found" }, 404);
  const result = await deleteChatMessage(user.id, id, messageId);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(sealChat(result), 200, { "Cache-Control": "no-store" });
}
