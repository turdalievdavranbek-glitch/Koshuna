import { getSessionUser } from "@/server/auth";
import { json } from "@/server/http";
import type { ShopStatsPeriod } from "@/lib/shop-stats-types";
import { shopStatsFor } from "@/server/shop-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodOf(raw: string | null): ShopStatsPeriod {
  if (raw === "week" || raw === "month") return raw;
  return "day";
}

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return json({ error: "auth" }, 401);
  const period = periodOf(new URL(req.url).searchParams.get("period"));
  const shops = await shopStatsFor(user.id, period);
  return json({ period, shops }, 200, { "Cache-Control": "no-store" });
}
