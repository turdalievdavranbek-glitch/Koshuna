import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { isDbUserId } from "@/lib/phone";
import { buildPublicProfile } from "@/lib/public-name";
import { telegramUsername } from "@/lib/telegram-username";
import { getDb } from "@/server/db";
import { listings, shops, users } from "@/server/db/schema";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const VISIBLE = ["active", "promoted", "reserved"];

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "not-found" }, 404);
  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name, createdAt: users.createdAt, telegram: users.telegram })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return json({ error: "not-found" }, 404);
  const counts = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(
        eq(listings.ownerId, id),
        inArray(listings.status, VISIBLE),
        eq(listings.underReview, false),
        sql`(${listings.shopId} is null or not exists (select 1 from ${shops} where ${shops.id} = ${listings.shopId} and ${shops.underReview} = true))`,
      ),
    );
  // The Telegram username is public by the owner's choice (profile «Telegram» field).
  return json({ ...buildPublicProfile(row, Number(counts[0]?.n ?? 0)), telegram: telegramUsername(row.telegram) });
}
