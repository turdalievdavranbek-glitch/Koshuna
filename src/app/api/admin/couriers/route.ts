import { NextResponse } from "next/server";
import { canReviewCouriers, listCourierApplications } from "@/server/couriers";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await canReviewCouriers(user.id))) return json({ error: "forbidden" }, 403);
  return json({ couriers: await listCourierApplications() }, 200, { "Cache-Control": "no-store" });
}
