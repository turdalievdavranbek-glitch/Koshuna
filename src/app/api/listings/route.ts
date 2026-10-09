import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { blocks, listings, shops } from "@/server/db/schema";
import { json } from "@/server/http";
import { listingCounts, rowToListing } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_STATUS = ["active", "promoted", "reserved", "closed", "withdrawn"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const section = url.searchParams.get("section");
  const city = url.searchParams.get("city");
  const q = url.searchParams.get("q")?.trim() || "";
  const cursor = url.searchParams.get("cursor");
  const requested = Number(url.searchParams.get("limit") || 100);
  const limit = Math.min(1000, Math.max(1, Number.isFinite(requested) ? requested : 100));
  const filters: SQL[] = [
    inArray(listings.status, PUBLIC_STATUS),
    eq(listings.underReview, false),
    sql`(${listings.shopId} is null or not exists (select 1 from ${shops} where ${shops.id} = ${listings.shopId} and ${shops.underReview} = true))`,
  ];
  const viewer = await getSessionUser(req).catch(() => null);
  if (viewer) {
    filters.push(
      sql`(${listings.ownerId} is null or ${listings.ownerId} not in (select ${blocks.blockedUserId} from ${blocks} where ${blocks.blockerId} = ${viewer.id}))`,
    );
  }
  if (section) filters.push(eq(listings.section, section));
  if (city && city !== "all") filters.push(eq(listings.city, city));
  if (q) {
    try {
      filters.push(sql`search_vector @@ websearch_to_tsquery('russian', ${q})`);
    } catch {
      return json({ listings: [], counts: {}, nextCursor: null });
    }
  }
  if (cursor) {
    const split = cursor.indexOf("|");
    const stamp = split >= 0 ? cursor.slice(0, split) : "";
    const id = split >= 0 ? cursor.slice(split + 1) : "";
    const at = new Date(stamp);
    if (id && !Number.isNaN(at.getTime())) {
      filters.push(sql`(${listings.createdAt}, ${listings.id}) < (${at.toISOString()}::timestamptz, ${id})`);
    }
  }
  let rows;
  try {
    rows = await getDb()
      .select()
      .from(listings)
      .where(and(...filters))
      .orderBy(desc(listings.createdAt), desc(listings.id))
      .limit(limit + 1);
  } catch {
    return json({ listings: [], counts: {}, nextCursor: null });
  }
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const counts: Record<string, { likes: number; dislikes: number }> = {};
  return json({
    listings: page.map((row) => {
      counts[row.id] = listingCounts(row);
      return rowToListing(row);
    }),
    counts,
    nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  });
}
