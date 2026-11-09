import { listIncomingPurchaseRequests } from "@/server/purchase-requests";
import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const requests = await listIncomingPurchaseRequests(user.id);
  return json({ requests }, 200, { "Cache-Control": "no-store" });
}
