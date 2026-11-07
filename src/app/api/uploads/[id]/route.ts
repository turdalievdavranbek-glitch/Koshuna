import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { media } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";
import { writeChunk } from "@/server/media";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function owned(req: Request, id: string) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const rows = await getDb().select().from(media).where(and(eq(media.id, id), eq(media.ownerId, user.id))).limit(1);
  if (!rows[0]) return json({ error: "not-found" }, 404);
  return rows[0];
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await owned(req, id);
  if (row instanceof NextResponse) return row;
  return json({ received: row.received, status: row.uploadStatus });
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const row = await owned(req, id);
  if (row instanceof NextResponse) return row;
  if (row.uploadStatus !== "uploading") return json({ error: "closed" }, 409);
  const offset = Number(new URL(req.url).searchParams.get("offset"));
  if (!Number.isInteger(offset) || offset < 0) return json({ error: "offset" }, 400);
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > 4 * 1024 * 1024) return json({ error: "chunk" }, 400);
  if (offset !== row.received) return json({ received: row.received }, 409);
  let wrote: { received: number } | { mismatch: number };
  try {
    wrote = await writeChunk(id, offset, bytes);
  } catch {
    return json({ error: "chunk" }, 400);
  }
  if ("mismatch" in wrote) return json({ received: wrote.mismatch }, 409);
  await getDb().update(media).set({ received: wrote.received }).where(eq(media.id, id));
  return json({ received: wrote.received });
}
