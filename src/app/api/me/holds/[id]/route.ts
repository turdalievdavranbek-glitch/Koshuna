import { answerHold } from "@/server/holds";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Body = { action?: string };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  if (body?.action !== "confirm" && body?.action !== "decline") return json({ error: "action" }, 400);
  const { id } = await ctx.params;
  const result = await answerHold(user.id, id, body.action);
  if ("error" in result) return json({ error: result.error }, result.status);
  return json({ hold: result.hold });
}
