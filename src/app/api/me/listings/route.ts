import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { json, requireUser } from "@/server/http";
import { listingCounts, rowToListing } from "@/server/mappers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const rows = await getDb().select().from(listings).where(eq(listings.ownerId, user.id)).orderBy(desc(listings.createdAt));
  const counts: Record<string, { likes: number; dislikes: number }> = {};
  return json({
    listings: rows.map((row) => {
      counts[row.id] = listingCounts(row);
      return rowToListing(row);
    }),
    counts,
  });
}
