import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { circlePicks } from "@/server/db/schema";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ids written by the hourly circles job, best first. Empty until that job has run for the city. */
export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city") || "";
  if (!city) return json({ ids: [] });
  const rows = await getDb()
    .select({ listingId: circlePicks.listingId })
    .from(circlePicks)
    .where(eq(circlePicks.city, city))
    .orderBy(asc(circlePicks.rank));
  return json({ ids: rows.map((row) => row.listingId) });
}
