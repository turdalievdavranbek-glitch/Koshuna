import { eq } from "drizzle-orm";
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify, type JWTVerifyGetKey } from "jose";
import { getDb } from "./db";
import { appleRefreshTokens } from "./db/schema";

const APPLE_KEYS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_ISSUER = "https://appleid.apple.com";
const DEFAULT_BUNDLE_ID = "com.koshuna.app";

export class AppleAuthError extends Error {
  constructor(readonly code: "invalid-token") {
    super(code);
  }
}

export type AppleIdClaims = {
  sub: string;
  email?: string;
};

/** Native Sign in with Apple audience. The bundle id is public; env overrides it. */
export function appleBundleId(): string {
  return (process.env.APPLE_BUNDLE_ID || DEFAULT_BUNDLE_ID).trim() || DEFAULT_BUNDLE_ID;
}

export function appleTeamId(): string {
  return (process.env.APPLE_TEAM_ID || "").trim().toUpperCase();
}

/**
 * `/.well-known/apple-app-site-association`. An empty team id yields no appIDs
 * so a missing secret does not advertise a fake association.
 */
export function appleAppSiteAssociation(teamId = appleTeamId()): {
  applinks: { apps: string[]; details: Array<{ appIDs: string[]; paths: string[] }> };
} {
  const team = teamId.trim().toUpperCase();
  const details = /^[A-Z0-9]{10}$/.test(team)
    ? [{ appIDs: [`${team}.${appleBundleId()}`], paths: ["*"] }]
    : [];
  return { applinks: { apps: [], details } };
}

/** First sign-in only. Later Apple responses omit the name; empty parts are dropped. */
export function applePersonName(given: unknown, family: unknown): string | undefined {
  const parts = [given, family]
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.length <= 80);
  const name = parts.join(" ").trim();
  return name || undefined;
}

export function appleAuthorizationCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim();
  if (!code || code.length > 1024 || /\s/.test(code)) return null;
  return code;
}

/**
 * Verify an Apple identity token. `keySet` is for tests only.
 * The route always uses Apple's published JWKS.
 */
export async function verifyAppleIdToken(
  token: string,
  opts: { audience: string; keySet?: JWTVerifyGetKey },
): Promise<AppleIdClaims> {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    const verified = await jwtVerify(token, opts.keySet ?? APPLE_KEYS, {
      issuer: APPLE_ISSUER,
      audience: opts.audience,
      clockTolerance: 60,
    });
    payload = verified.payload;
  } catch {
    throw new AppleAuthError("invalid-token");
  }
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) throw new AppleAuthError("invalid-token");
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const verifiedEmail = payload.email_verified;
  if (email && verifiedEmail !== true && verifiedEmail !== "true") throw new AppleAuthError("invalid-token");
  return { sub, email };
}

function applePrivateKeyPem(): string | null {
  const raw = (process.env.APPLE_PRIVATE_KEY || "").trim();
  if (!raw) return null;
  let pem = raw;
  if (!pem.includes("BEGIN")) {
    try {
      pem = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  pem = pem.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN PRIVATE KEY")) return null;
  return pem.endsWith("\n") ? pem : `${pem}\n`;
}

/** Revoke is optional. Login and account deletion work when any of these is missing. */
export function appleRevokeConfigured(): boolean {
  const keyId = (process.env.APPLE_KEY_ID || "").trim();
  const team = (process.env.APPLE_TEAM_ID || "").trim();
  return Boolean(keyId && team && appleBundleId() && applePrivateKeyPem());
}

async function appleClientSecret(): Promise<string | null> {
  if (!appleRevokeConfigured()) return null;
  const pem = applePrivateKeyPem();
  const keyId = (process.env.APPLE_KEY_ID || "").trim();
  const teamId = (process.env.APPLE_TEAM_ID || "").trim();
  if (!pem || !keyId || !teamId) return null;
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience(APPLE_ISSUER)
    .setSubject(appleBundleId())
    .sign(key);
}

async function postAppleForm(path: string, fields: Record<string, string>): Promise<Response> {
  return fetch(`https://appleid.apple.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(8000),
  });
}

async function exchangeAppleCode(code: string): Promise<string | null> {
  const secret = await appleClientSecret();
  if (!secret) return null;
  const res = await postAppleForm("/auth/token", {
    client_id: appleBundleId(),
    client_secret: secret,
    code,
    grant_type: "authorization_code",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { refresh_token?: unknown } | null;
  return typeof data?.refresh_token === "string" && data.refresh_token ? data.refresh_token : null;
}

/**
 * Exchange the one-time authorization code for a refresh token and store it.
 * Failures are swallowed: the user is already signed in.
 */
export async function rememberAppleRefreshToken(userId: string, authorizationCode: string | null): Promise<void> {
  if (!authorizationCode || !appleRevokeConfigured()) return;
  try {
    const refresh = await exchangeAppleCode(authorizationCode);
    if (!refresh) return;
    await getDb()
      .insert(appleRefreshTokens)
      .values({ userId, refreshToken: refresh, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appleRefreshTokens.userId,
        set: { refreshToken: refresh, updatedAt: new Date() },
      });
  } catch {
    /* Optional. A missing table or Apple outage must not fail login. */
  }
}

async function revokeRefreshToken(token: string): Promise<void> {
  const secret = await appleClientSecret();
  if (!secret) return;
  await postAppleForm("/auth/revoke", {
    client_id: appleBundleId(),
    client_secret: secret,
    token,
    token_type_hint: "refresh_token",
  });
}

/**
 * Best-effort Sign in with Apple token revoke during account deletion.
 * Does nothing when the key is not configured, and never throws.
 */
export async function revokeAppleRefreshToken(userId: string): Promise<void> {
  if (!appleRevokeConfigured()) return;
  try {
    const db = getDb();
    const rows = await db.select().from(appleRefreshTokens).where(eq(appleRefreshTokens.userId, userId)).limit(1);
    const token = rows[0]?.refreshToken;
    if (token) {
      try {
        await revokeRefreshToken(token);
      } catch {
        /* Apple can be down. The local copy is still removed below. */
      }
    }
    await db.delete(appleRefreshTokens).where(eq(appleRefreshTokens.userId, userId));
  } catch {
    /* Table not migrated yet, or the database rejected the read. Deletion continues. */
  }
}
