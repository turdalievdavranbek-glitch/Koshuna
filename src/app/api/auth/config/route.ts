import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Runtime client id so a deploy can set it without rebuilding the site. */
export async function GET() {
  const fromServer = (process.env.GOOGLE_WEB_CLIENT_ID || "").trim();
  const fromPublic = (process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();
  const clientId = fromServer || fromPublic || null;
  return json({ google: { clientId } }, 200, { "cache-control": "no-store" });
}
