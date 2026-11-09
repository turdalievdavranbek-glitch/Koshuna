import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { shops } from "@/server/db/schema";
import { shopRating } from "@/server/delivery-standing";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const rows = await getDb().select({ verifiedAt: shops.verifiedAt, enabled: shops.deliveryEnabled }).from(shops).where(eq(shops.id, id)).limit(1);
  if (!rows[0]) return json({ error: "not-found" }, 404);
  const rating = await shopRating(id);
  return json(
    { verified: Boolean(rows[0].verifiedAt), delivery: rows[0].enabled, rating: rating.rating, count: rating.count },
    200,
    { "Cache-Control": "no-store" },
  );
}
