import { eq } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { devices } from "@/server/db/schema";
import { guardCsrf, json, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string; platform?: string; appVersion?: string; lang?: string; notificationsEnabled?: boolean };

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const body = await readJson<Body>(req);
  if (!body?.token || typeof body.token !== "string") return json({ error: "token" }, 400);
  const user = await getSessionUser(req).catch(() => null);
  const db = getDb();
  const existing = await db.select().from(devices).where(eq(devices.fcmToken, body.token)).limit(1);
  const now = new Date();
  if (existing[0]) {
    await db
      .update(devices)
      .set({
        userId: user?.id ?? existing[0].userId,
        platform: body.platform ?? existing[0].platform,
        appVersion: body.appVersion ?? existing[0].appVersion,
        lang: body.lang ?? existing[0].lang,
        notificationsEnabled: body.notificationsEnabled ?? existing[0].notificationsEnabled,
        lastSeenAt: now,
      })
      .where(eq(devices.id, existing[0].id));
  } else {
    await db.insert(devices).values({
      userId: user?.id ?? null,
      fcmToken: body.token,
      platform: body.platform ?? null,
      appVersion: body.appVersion ?? null,
      lang: body.lang ?? null,
      notificationsEnabled: body.notificationsEnabled ?? true,
      lastSeenAt: now,
    });
  }
  return json({ ok: true });
}
