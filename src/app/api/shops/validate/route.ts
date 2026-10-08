import { NextResponse } from "next/server";
import type { User } from "@/lib/types";
import { validateShopAction, type ShopBody } from "@/server/shops";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: ShopBody;
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
  const invalid = validateShopAction(body, user);
  if (invalid) return NextResponse.json(invalid.body, { status: invalid.status });
  return NextResponse.json({ ok: true });
}
