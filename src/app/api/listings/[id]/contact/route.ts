import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ownerBlockedRequester } from "@/lib/blocks";
import { normalizePhoneInput } from "@/lib/phone";
import { telegramUsername } from "@/lib/telegram-username";
import { getDb } from "@/server/db";
import { blocks, listings, shops, users } from "@/server/db/schema";
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
  if (row.underReview && row.ownerId !== user.id) return json({ error: "not-found" }, 404);
  if (row.ownerId) {
    const blockedRows = await db
      .select({ blockerId: blocks.blockerId, blockedUserId: blocks.blockedUserId })
      .from(blocks)
      .where(and(eq(blocks.blockerId, row.ownerId), eq(blocks.blockedUserId, user.id)))
      .limit(1);
    if (ownerBlockedRequester(blockedRows, row.ownerId, user.id)) return json({ error: "blocked" }, 403);
  }
  let raw: string | null = null;
  let telegram: string | null = null;
  if (row.shopId) {
    const shopRows = await db
      .select({ phone: shops.phone, telegram: shops.telegram, underReview: shops.underReview, status: shops.status })
      .from(shops)
      .where(eq(shops.id, row.shopId))
      .limit(1);
    if ((shopRows[0]?.underReview || shopRows[0]?.status === "hidden") && row.ownerId !== user.id) {
      return json({ error: "not-found" }, 404);
    }
    raw = shopRows[0]?.phone ?? null;
    telegram = telegramUsername(shopRows[0]?.telegram);
  }
  if ((!raw || !telegram) && row.ownerId) {
    const owners = await db.select({ phone: users.phone, telegram: users.telegram }).from(users).where(eq(users.id, row.ownerId)).limit(1);
    if (!raw) raw = owners[0]?.phone ?? null;
    // Point items: the point's Telegram first, else the owner's.
    if (!telegram) telegram = telegramUsername(owners[0]?.telegram);
  }
  return json({ phone: normalized(raw), telegram }, 200, { "Cache-Control": "no-store" });
}
