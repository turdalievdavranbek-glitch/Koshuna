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

/**
 * Verify a Google ID token. `keySet` is for tests only and is never read from
 * the request or from env — the route always uses Google's published certs.
 */
export async function verifyGoogleIdToken(
  token: string,
  opts: { audience: string; nonce: string | null; keySet?: JWTVerifyGetKey },
): Promise<GoogleIdClaims> {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    const verified = await jwtVerify(token, opts.keySet ?? GOOGLE_CERTS, {
      issuer: ISSUERS,
      audience: opts.audience,
      clockTolerance: 60,
    });
    payload = verified.payload;
  } catch {
    throw new GoogleAuthError("invalid-token");
  }
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) throw new GoogleAuthError("invalid-token");
  if (payload.email != null && payload.email_verified !== true) throw new GoogleAuthError("invalid-token");
  const nonce = payload.nonce;
  if (!opts.nonce || typeof nonce !== "string" || nonce !== opts.nonce) throw new GoogleAuthError("bad-nonce");
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    given_name: typeof payload.given_name === "string" ? payload.given_name : undefined,
  };
}
