import { sessionIsAdmin } from "@/server/auth";
import { listFeedback, setFeedbackStatus } from "@/server/feedback";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { isDbUserId } from "@/lib/phone";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminUser(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  return user;
}

export async function GET(req: Request) {
  const user = await adminUser(req);
  if (user instanceof NextResponse) return user;
  return json({ items: await listFeedback() });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await adminUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ id?: string; status?: string }>(req);
  if (!body?.id || !isDbUserId(body.id)) return json({ error: "bad-id" }, 400);
  const ok = await setFeedbackStatus(body.id, body.status ?? "");
  return ok ? json({ ok: true }) : json({ error: "not-found" }, 404);
}
