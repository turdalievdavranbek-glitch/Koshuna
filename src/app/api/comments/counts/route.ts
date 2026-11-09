import { commentCounts } from "@/server/comments";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?ids=a,b,c (up to 100): visible comment counts for cards. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter((id) => id && id.length <= 80))].slice(0, 100);
  const counts = await commentCounts(ids);
  return json({ counts }, 200, { "Cache-Control": "no-store" });
}
