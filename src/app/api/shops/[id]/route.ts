import { eq } from "drizzle-orm";
import type { Shop, ShopProduct } from "@/lib/types";
import { getDb } from "@/server/db";
import { shops } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { mediaUrlError, rowToShop, sessionAsUser, shopMediaUrls } from "@/server/mappers";
import { saveShopForUser, validateShopAction, type ShopBody } from "@/server/shops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const rows = await getDb().select().from(shops).where(eq(shops.id, id)).limit(1);
  if (!rows[0]) return json({ error: "not-found" }, 404);
  const shop = rowToShop(rows[0]);
  if (shop.status !== "active") {
    const user = await requireUser(_req);
    if (user instanceof NextResponse || user.id !== rows[0].ownerId) return json({ error: "not-found" }, 404);
  }
  return json({ shop });
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<ShopBody>(req);
  if (!body?.shop) return json({ ok: false, error: "bad-json" }, 400);
  const shop = { ...body.shop, id, ownerId: user.id } as Shop;
  if (body.product && shop.products) {
    const product = body.product as ShopProduct;
    if (product.id && !shop.products.some((row) => row.id === product.id)) {
      shop.products = [...shop.products, product];
    }
  }
  const clientUser = sessionAsUser(user);
  clientUser.name = user.name || shop.ownerName;
  const invalid = validateShopAction({ ...body, shop }, clientUser);
  if (invalid) return json(invalid.body, invalid.status);
  const urls = shopMediaUrls(shop);
  const mediaError = mediaUrlError(urls);
  if (mediaError) return json({ ok: false, error: mediaError }, 400);
  const saved = await saveShopForUser(user, shop);
  if ("error" in saved) return json({ ok: false, error: saved.error }, saved.status);
  return json({ ok: true, shop: saved.shop });
}
