import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { circlePicks } from "@/server/db/schema";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only. Picks are filled in Шаг 23. This step does not run the circles job. */
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
