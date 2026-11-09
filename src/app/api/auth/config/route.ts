import { json } from "@/server/http";
import { publicAuthConfig } from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Runtime client id so a deploy can set it without rebuilding the site. */
export async function GET() {
  return json(publicAuthConfig(), 200, { "cache-control": "no-store" });
}
