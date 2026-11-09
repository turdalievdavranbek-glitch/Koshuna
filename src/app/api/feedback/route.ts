import { getSessionUser } from "@/server/auth";
import { createFeedback, type FeedbackInput } from "@/server/feedback";
import { guardCsrf, json, readJson } from "@/server/http";
import { limiterIp, limitOr429 } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await getSessionUser(req).catch(() => null);
  const limited =
    limitOr429(`feedback:ip:${limiterIp(req)}`, user ? 20 : 5, 60 * 60_000) ??
    (user ? limitOr429(`feedback:u:${user.id}`, 20, 60 * 60_000) : null);
  if (limited) return limited;
  const body = await readJson<FeedbackInput>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const result = await createFeedback(user?.id ?? null, body);
  if ("error" in result) return json(result, 400);
  return json({ ok: true });
}
