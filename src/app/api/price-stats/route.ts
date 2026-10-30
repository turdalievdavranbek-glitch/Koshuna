import { and, eq, inArray } from "drizzle-orm";
import { MAGNET_KEYS, parseMagnetSettings } from "@/lib/magnet-config";
import { getDb } from "@/server/db";
import { appConfig, priceStats } from "@/server/db/schema";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/** Aggregates only: { n, p25, median, p75 }. No listing ids and no owners. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") ?? "").trim();
  const city = (url.searchParams.get("city") ?? "").trim();
  const unit = (url.searchParams.get("unit") ?? "").trim();
  if (!category || !city) return json({}, 404);

  const db = getDb();
  const configRows = await db
    .select()
    .from(appConfig)
    .where(inArray(appConfig.key, [MAGNET_KEYS.enabled, MAGNET_KEYS.priceMinN]));
  const config: Record<string, unknown> = {};
  for (const row of configRows) config[row.key] = row.value;
  const settings = parseMagnetSettings(config);
  if (!settings.enabled) return json({}, 404);

  const rows = await db
    .select({
      n: priceStats.n,
      p25: priceStats.p25,
      median: priceStats.median,
      p75: priceStats.p75,
    })
    .from(priceStats)
    .where(and(eq(priceStats.category, category), eq(priceStats.city, city), eq(priceStats.unit, unit)))
    .limit(1);
  const row = rows[0];
  const p25 = asNumber(row?.p25);
  const median = asNumber(row?.median);
  const p75 = asNumber(row?.p75);
  if (!row || row.n < settings.priceMinN || p25 == null || median == null || p75 == null) return json({}, 404);
  return json({ n: row.n, p25, median, p75 });
}
