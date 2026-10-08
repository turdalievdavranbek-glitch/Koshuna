import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizePhoneInput } from "@/lib/phone";
import { getDb } from "@/server/db";
import { listings, shops, users } from "@/server/db/schema";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const VISIBLE = new Set(["active", "promoted", "reserved"]);

function normalized(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return normalizePhoneInput(raw);
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const row = rows[0];
  if (!row || (!VISIBLE.has(row.status) && row.ownerId !== user.id)) return json({ error: "not-found" }, 404);
  let raw: string | null = null;
  if (row.shopId) {
    const shopRows = await db.select({ phone: shops.phone }).from(shops).where(eq(shops.id, row.shopId)).limit(1);
    raw = shopRows[0]?.phone ?? null;
  }
  if (!raw && row.ownerId) {
    const owners = await db.select({ phone: users.phone }).from(users).where(eq(users.id, row.ownerId)).limit(1);
    raw = owners[0]?.phone ?? null;
  }
  return json({ phone: normalized(raw) }, 200, { "Cache-Control": "no-store" });
}
