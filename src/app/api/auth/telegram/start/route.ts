import { json } from "@/server/http";
import { beginTelegramAppLogin } from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const result = beginTelegramAppLogin(req);
  if (result.status === 200) {
    return json({ link: result.link }, 200, { "cache-control": "no-store", "set-cookie": result.cookie });
  }
  const error = result.status === 429 ? "rate" : result.status === 403 ? "bad-origin" : "not-configured";
  return json({ ok: false, error }, result.status, { "cache-control": "no-store" });
}
