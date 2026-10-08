import { NextResponse } from "next/server";
import { GoogleAuthError, googleWebClientId, verifyGoogleIdToken } from "@/server/google-auth";
import { readCookie, signInWithIdentity } from "@/server/auth";
import { json, readJson } from "@/server/http";
import { publicUser } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearNonceCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `kgn=; HttpOnly; Path=/api/auth; SameSite=Lax${secure}; Max-Age=0`;
}

/** The origin the browser should match. Behind nginx, Host + X-Forwarded-Proto is the public origin. */
function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host).split(",")[0].trim();
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded ? forwarded.split(",")[0].trim() : url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const audience = googleWebClientId();
  if (!audience) return json({ ok: false, error: "not-configured" }, 503, { "cache-control": "no-store" });

  const origin = req.headers.get("origin");
  if (origin && origin !== requestOrigin(req)) {
    return json({ ok: false, error: "bad-origin" }, 403, { "cache-control": "no-store" });
  }

  const body = await readJson<{ credential?: string }>(req);
  const credential = body?.credential;
  if (!credential || typeof credential !== "string") {
    return json({ ok: false, error: "invalid-token" }, 401, { "cache-control": "no-store" });
  }

  let claims;
  try {
    claims = await verifyGoogleIdToken(credential, {
      audience,
      nonce: readCookie(req, "kgn"),
    });
  } catch (err) {
    const code = err instanceof GoogleAuthError ? err.code : "invalid-token";
    return json({ ok: false, error: code }, 401, { "cache-control": "no-store" });
  }

  try {
    const signed = await signInWithIdentity({
      provider: "google",
      providerUserId: claims.sub,
      profile: {
        name: claims.given_name || claims.name,
        email: claims.email,
      },
      userAgent: req.headers.get("user-agent"),
    });
    const res = NextResponse.json(
      { ok: true, user: publicUser(signed.user), isNew: signed.isNew },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
    res.headers.append("set-cookie", signed.cookie);
    res.headers.append("set-cookie", clearNonceCookie());
    return res;
  } catch (err) {
    const unavailable = err instanceof Error && err.message === "account-unavailable";
    const status = unavailable ? 403 : 500;
    const error = unavailable ? "account-unavailable" : "auth";
    return json({ ok: false, error }, status, {
      "cache-control": "no-store",
      "set-cookie": clearNonceCookie(),
    });
  }
}
