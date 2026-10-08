import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { shops, subscriptions } from "@/server/db/schema";
import { json, requireUser } from "@/server/http";
import { rowToShop } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shops this account follows. Hidden points are not a list row. */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const rows = await getDb()
    .select({ shop: shops })
    .from(subscriptions)
    .innerJoin(shops, eq(subscriptions.shopId, shops.id))
    .where(and(eq(subscriptions.userId, user.id), eq(shops.status, "active")))
    .orderBy(desc(subscriptions.createdAt));
  return json({ shops: rows.map((row) => rowToShop(row.shop)) });
}
