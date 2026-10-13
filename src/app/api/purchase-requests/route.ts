import { limitOr429 } from "@/server/rate-limit";
import { createPurchaseRequest } from "@/server/purchase-requests";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = limitOr429(`buyreq-hour:${user.id}`, 5, 3_600_000) ?? limitOr429(`buyreq-day:${user.id}`, 15, 86_400_000);
  if (limited) return limited;
  const body = await readJson<{
    category?: string;
    text?: string;
    quantity?: number;
    unit?: string;
    district?: string;
    deadline?: string;
    needsDelivery?: boolean;
  }>(req);
  const result = await createPurchaseRequest(user.id, body ?? {});
  if ("error" in result) return json({ error: result.error }, result.status);
  return json(result, 200, { "Cache-Control": "no-store" });
}
