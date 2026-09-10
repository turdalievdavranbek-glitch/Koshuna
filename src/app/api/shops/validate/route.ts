import { NextResponse } from "next/server";
import { canMutate, mediaError, productErrors, publishErrors, type ShopAction } from "@/lib/shop-rules";
import { normalizePhone } from "@/lib/shops";
import type { Shop, ShopProduct, User } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  action: ShopAction;
  shop: Shop;
  ownerPhone?: string;
  ownerName?: string;
  product?: Partial<ShopProduct>;
  videoBytes?: number;
  videoSeconds?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  const phone = body.ownerPhone ?? "";
  if (!phone) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  const user: User = {
    name: body.ownerName || "Seller",
    phone,
    joinedYear: 2024,
    verified: true,
    rating: 0,
    views: 0,
  };
  if (normalizePhone(body.shop.ownerPhone) !== normalizePhone(phone)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const media = mediaError(body.videoBytes, body.videoSeconds);
  if (media) return NextResponse.json({ ok: false, error: media }, { status: 400 });

  const action = body.action;
  if (action === "upsert-product" && body.product) {
    const errs = productErrors(body.product);
    if (errs.length) return NextResponse.json({ ok: false, error: errs[0], errors: errs }, { status: 400 });
  }
  const gate = canMutate(body.shop, user, action);
  if (gate) {
    const extra = action === "publish" ? publishErrors(body.shop) : [];
    return NextResponse.json({ ok: false, error: gate, errors: extra.length ? extra : [gate] }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
