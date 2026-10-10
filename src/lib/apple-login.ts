import type { User } from "./types";
import { nativeAppleSignIn } from "./native-auth";

export type AppleLoginResult =
  | { ok: true; user: User; isNew: boolean }
  | { ok: false; status: "cancelled" | "blocked" | "error" };

function isCancel(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  const message = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return code === "SIGN_IN_CANCELED" || /cancel/i.test(message);
}

/** Native Sign in with Apple, then the same session cookie path as Google. iOS only. */
export async function startAppleSignIn(): Promise<AppleLoginResult> {
  let identityToken = "";
  let authorizationCode: string | null = null;
  let givenName: string | null = null;
  let familyName: string | null = null;
  try {
    const result = await nativeAppleSignIn();
    identityToken = result.idToken || "";
    authorizationCode = result.authorizationCode || null;
    givenName = result.givenName ?? null;
    familyName = result.familyName ?? null;
  } catch (err) {
    if (isCancel(err)) return { ok: false, status: "cancelled" };
    return { ok: false, status: "error" };
  }
  if (!identityToken) return { ok: false, status: "error" };
  try {
    const res = await fetch("/api/auth/apple", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identityToken, authorizationCode, givenName, familyName }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; user?: User; isNew?: boolean; error?: string } | null;
    if (data?.ok && data.user?.id) return { ok: true, user: data.user, isNew: data.isNew === true };
    if (res.status === 403 || data?.error === "account-unavailable") return { ok: false, status: "blocked" };
    return { ok: false, status: "error" };
  } catch {
    return { ok: false, status: "error" };
  }
}
