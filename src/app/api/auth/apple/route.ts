import { NextResponse } from "next/server";
import {
  AppleAuthError,
  appleAuthorizationCode,
  appleBundleId,
  applePersonName,
  rememberAppleRefreshToken,
  verifyAppleIdToken,
} from "@/server/apple-auth";
import { signInWithIdentity } from "@/server/auth";
import { json, readJson } from "@/server/http";
import { publicUser } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host).split(",")[0].trim();
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded ? forwarded.split(",")[0].trim() : url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== requestOrigin(req)) {
    return json({ ok: false, error: "bad-origin" }, 403, { "cache-control": "no-store" });
  }

  const body = await readJson<{
    identityToken?: string;
    authorizationCode?: string;
    givenName?: string;
    familyName?: string;
  }>(req);
  const identityToken = body?.identityToken;
  if (!identityToken || typeof identityToken !== "string") {
    return json({ ok: false, error: "invalid-token" }, 401, { "cache-control": "no-store" });
  }

  let claims;
  try {
    claims = await verifyAppleIdToken(identityToken, { audience: appleBundleId() });
  } catch (err) {
    const code = err instanceof AppleAuthError ? err.code : "invalid-token";
    return json({ ok: false, error: code }, 401, { "cache-control": "no-store" });
  }

  try {
    const signed = await signInWithIdentity({
      provider: "apple",
      providerUserId: claims.sub,
      profile: {
        name: applePersonName(body?.givenName, body?.familyName),
        email: claims.email,
      },
      userAgent: req.headers.get("user-agent"),
    });
    await rememberAppleRefreshToken(signed.user.id, appleAuthorizationCode(body?.authorizationCode));
    const res = NextResponse.json(
      { ok: true, user: publicUser(signed.user), isNew: signed.isNew },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
    res.headers.append("set-cookie", signed.cookie);
    return res;
  } catch (err) {
    const unavailable = err instanceof Error && err.message === "account-unavailable";
    const status = unavailable ? 403 : 500;
    const error = unavailable ? "account-unavailable" : "auth";
    return json({ ok: false, error }, status, { "cache-control": "no-store" });
  }
}
