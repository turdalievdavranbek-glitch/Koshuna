import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { photoMaxBytes, removePrivate, sniffImage, writeScopedPhoto } from "@/server/courier-files";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad-form" }, 400);
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size <= 0 || file.size > photoMaxBytes()) return json({ error: "bad-photo" }, 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return json({ error: "bad-photo" }, 400);
  const db = getDb();
  const rows = await db.select({ path: orders.receiptPath, courierId: orders.courierId, status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order || order.courierId !== user.id) return json({ error: "forbidden" }, 403);
  if (order.status !== "assigned") return json({ error: "state" }, 409);
  const path = await writeScopedPhoto("orders", id, bytes, ext);
  await db.update(orders).set({ receiptPath: path }).where(and(eq(orders.id, id), eq(orders.courierId, user.id), eq(orders.status, "assigned")));
  await removePrivate(order.path);
  return json({ ok: true });
}
