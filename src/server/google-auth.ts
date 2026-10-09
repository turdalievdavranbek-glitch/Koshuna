import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_CERTS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export class GoogleAuthError extends Error {
  constructor(readonly code: "invalid-token" | "bad-nonce") {
    super(code);
  }
}

export type GoogleIdClaims = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
};

/** Web client id from the runtime env. Empty means login is not configured. */
export function googleWebClientId(): string {
  return (process.env.GOOGLE_WEB_CLIENT_ID || "").trim();
}

/** iOS OAuth client id. Optional. Absent means only the web client id is accepted. */
export function googleIosClientId(): string {
  return (process.env.GOOGLE_IOS_CLIENT_ID || "").trim();
}

/**
 * Audiences for `POST /api/auth/google`. The web client id is required.
 * When `GOOGLE_IOS_CLIENT_ID` is set, an iOS ID token is accepted too.
 */
export function googleAudiences(): string[] {
  const web = googleWebClientId();
  if (!web) return [];
  const ios = googleIosClientId();
  return ios && ios !== web ? [web, ios] : [web];
}

function isIosGoogleToken(payload: { aud?: unknown; azp?: unknown }): boolean {
  const ios = googleIosClientId();
  if (!ios) return false;
  const aud = payload.aud;
  const auds = typeof aud === "string" ? [aud] : Array.isArray(aud) ? aud.filter((item) => typeof item === "string") : [];
  if (auds.includes(ios)) return true;
  return payload.azp === ios;
}

/**
 * Verify a Google ID token. `keySet` is for tests only and is never read from
 * the request or from env — the route always uses Google's published certs.
 *
 * Web and Android tokens must match the nonce cookie. The iOS Google SDK used
 * by `@capawesome/capacitor-google-sign-in` does not attach that nonce, so a
 * token whose `aud` or `azp` is `GOOGLE_IOS_CLIENT_ID` skips the nonce check.
 */
export async function verifyGoogleIdToken(
  token: string,
  opts: { audience: string | string[]; nonce: string | null; keySet?: JWTVerifyGetKey },
): Promise<GoogleIdClaims> {
  const audience = (Array.isArray(opts.audience) ? opts.audience : [opts.audience]).map((id) => id.trim()).filter(Boolean);
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    const verified = await jwtVerify(token, opts.keySet ?? GOOGLE_CERTS, {
      issuer: ISSUERS,
      audience,
      clockTolerance: 60,
    });
    payload = verified.payload;
  } catch {
    throw new GoogleAuthError("invalid-token");
  }
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) throw new GoogleAuthError("invalid-token");
  if (payload.email != null && payload.email_verified !== true) throw new GoogleAuthError("invalid-token");
  if (!isIosGoogleToken(payload)) {
    const nonce = payload.nonce;
    if (!opts.nonce || typeof nonce !== "string" || nonce !== opts.nonce) throw new GoogleAuthError("bad-nonce");
  }
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    given_name: typeof payload.given_name === "string" ? payload.given_name : undefined,
  };
}
