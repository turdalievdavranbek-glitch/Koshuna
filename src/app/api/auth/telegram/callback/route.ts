import { NextResponse } from "next/server";
import { readCookie, signInWithIdentity } from "@/server/auth";
import {
  clearTelegramDestCookie,
  publicOrigin,
  safeNextPath,
  telegramBotToken,
  verifyTelegramLogin,
} from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTo(req: Request, path: string, cookies: string[] = []): NextResponse {
  const res = NextResponse.redirect(new URL(path, publicOrigin(req)), 302);
  res.headers.set("cache-control", "no-store");
  for (const cookie of cookies) res.headers.append("set-cookie", cookie);
  return res;
}

/** Website widget. Telegram redirects here; the hash is checked with the bot token. */
export async function GET(req: Request) {
  const token = telegramBotToken();
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const checked = token ? verifyTelegramLogin(params, token) : null;
  if (!checked) return redirectTo(req, "/login?tg=error");

  try {
    const signed = await signInWithIdentity({
      provider: "telegram",
      providerUserId: checked.id,
      profile: { name: checked.firstName },
      userAgent: req.headers.get("user-agent"),
    });
    const dest = safeNextPath(readCookie(req, "ktgdest"));
    return redirectTo(req, dest, [signed.cookie, clearTelegramDestCookie()]);
  } catch (err) {
    const blocked = err instanceof Error && err.message === "account-unavailable";
    return redirectTo(req, blocked ? "/login?tg=blocked" : "/login?tg=error");
  }
}
