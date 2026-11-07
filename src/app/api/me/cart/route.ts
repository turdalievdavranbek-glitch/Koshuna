import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cartItems } from "@/server/db/schema";
import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const rows = await getDb()
    .select({ listingId: cartItems.listingId })
    .from(cartItems)
    .where(eq(cartItems.userId, user.id))
    .orderBy(desc(cartItems.addedAt));
  return json({ favouriteIds: rows.map((row) => row.listingId) });
}
