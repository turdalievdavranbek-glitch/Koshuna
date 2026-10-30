import { sessionIsAdmin } from "@/server/auth";
import { feedbackFile } from "@/server/feedback";
import { json, requireUser } from "@/server/http";
import { isDbUserId } from "@/lib/phone";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "bad-id" }, 400);
  const kind = new URL(req.url).searchParams.get("kind") === "voice" ? "voice" : "photo";
  const file = await feedbackFile(id, kind);
  if (!file) return json({ error: "not-found" }, 404);
  return new NextResponse(new Uint8Array(file.body), {
    headers: { "content-type": file.mime, "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}
