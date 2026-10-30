import { clearSessionCookie, destroySession } from "@/server/auth";
import { guardCsrf, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  await destroySession(req);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
