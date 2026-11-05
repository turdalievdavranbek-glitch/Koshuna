import { NextResponse } from "next/server";
import { claimReferral, ensureReferralCode, referralLink } from "@/server/delivery-referrals";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const code = await ensureReferralCode(user.id);
  const link = referralLink(code);
  return json({ code, ...link }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ code?: unknown }>(req);
  const code = typeof body?.code === "string" ? body.code : "";
  const done = await claimReferral(user.id, code);
  if ("error" in done) return json({ error: done.error }, 400);
  return json({ ok: true });
}
