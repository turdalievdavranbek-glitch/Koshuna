import { NextResponse } from "next/server";
import { readPoint } from "@/lib/delivery";
import { quoteShop } from "@/server/delivery";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const point = readPoint(url.searchParams.get("lat"), url.searchParams.get("lng"));
  const quote = await quoteShop(url.searchParams.get("shop") ?? "", point?.lat ?? null, point?.lng ?? null);
  if ("error" in quote) return json({ error: quote.error }, quote.status);
  return json({ quote }, 200, { "Cache-Control": "no-store" });
}
