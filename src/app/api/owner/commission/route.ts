import { getSessionUser, sessionIsOwner } from "@/server/auth";
import { parseCommissionPercent, readCommissionPercent, writeCommissionPercent } from "@/server/commission-rate";
import { guardCsrf, json, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owner(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user || !(await sessionIsOwner(user.id))) return null;
    return user;
  } catch {
    return null;
  }
}

function missing() {
  return new Response(null, { status: 404 });
}

/** Owner only. Anyone else, including other admins, gets 404. */
export async function GET(req: Request) {
  if (!(await owner(req))) return missing();
  return json({ percent: await readCommissionPercent() }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  if (!(await owner(req))) return missing();
  const body = await readJson<{ percent?: unknown }>(req);
  const percent = parseCommissionPercent(body?.percent);
  if (percent == null) return json({ error: "bad-percent" }, 400);
  await writeCommissionPercent(percent);
  return json({ percent });
}
