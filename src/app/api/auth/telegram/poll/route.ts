import { NextResponse } from "next/server";
import { json } from "@/server/http";
import { publicUser } from "@/server/mappers";
import { clearTelegramRequestCookie, originAllowed, pollTelegramLogin, telegramRequestIdFrom } from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originAllowed(req)) return json({ ok: false, error: "bad-origin" }, 403, { "cache-control": "no-store" });
  const result = await pollTelegramLogin(telegramRequestIdFrom(req), req.headers.get("user-agent"));
  if (result.ok) {
    const res = NextResponse.json(
      { ok: true, user: publicUser(result.user), isNew: result.isNew },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
    res.headers.append("set-cookie", result.cookie);
    res.headers.append("set-cookie", clearTelegramRequestCookie());
    return res;
  }
  if (result.status === "pending") return json({ ok: false, status: "pending" }, 200, { "cache-control": "no-store" });
  const status = result.status === "blocked" ? 403 : 200;
  return json({ ok: false, status: result.status }, status, {
    "cache-control": "no-store",
    "set-cookie": clearTelegramRequestCookie(),
  });
}
