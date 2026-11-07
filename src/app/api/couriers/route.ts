import { courierIds } from "@/server/couriers";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public ids for the «✔ Курьер» badge. Same shape as /api/masters. */
export async function GET() {
  return json({ ids: await courierIds() }, 200, { "Cache-Control": "no-store" });
}
