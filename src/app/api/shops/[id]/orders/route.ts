import { NextResponse } from "next/server";
import type { Lang } from "@/lib/types";
import { listShopOrders } from "@/server/delivery";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const lang: Lang = user.lang === "ky" ? "ky" : "ru";
  const orders = await listShopOrders(user.id, id, lang);
  if ("error" in orders) return json({ error: orders.error }, orders.status);
  return json({ orders }, 200, { "Cache-Control": "no-store" });
}
