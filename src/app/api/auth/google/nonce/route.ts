import { randomBytes } from "crypto";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nonceCookie(nonce: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `kgn=${nonce}; HttpOnly; Path=/api/auth; SameSite=Lax${secure}; Max-Age=600`;
}

export async function GET() {
  const nonce = randomBytes(32).toString("base64url");
  return json({ nonce }, 200, {
    "cache-control": "no-store",
    "set-cookie": nonceCookie(nonce),
  });
}
