import { json } from "@/server/http";
import { masterIds } from "@/server/masters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ids of «Мастер-аккаунт» users (badge only). */
export async function GET() {
  return json({ ids: await masterIds() }, 200, { "Cache-Control": "public, max-age=60" });
}
