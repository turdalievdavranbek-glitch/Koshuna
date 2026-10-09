import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { pushTokens } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: unknown; platform?: unknown };

function cleanToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (token.length < 20 || token.length > 4096) return null;
  if (!/^[A-Za-z0-9_:\-.=+/]+$/.test(token)) return null;
  return token;
}

function cleanPlatform(value: unknown): "android" | "ios" | null {
  if (value === "android" || value === "ios") return value;
  return null;
}

/** Native app only. Upserts this device token for the signed-in user. */
export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  const token = cleanToken(body?.token);
  const platform = cleanPlatform(body?.platform);
  if (!token || !platform) return json({ error: "token" }, 400);
  const now = new Date();
  await getDb()
    .insert(pushTokens)
    .values({ userId: user.id, token, platform, lastSeen: now })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: user.id, platform, lastSeen: now },
    });
  return json({ ok: true });
}

/** Removes this device token. Other devices of the same user stay registered. */
export async function DELETE(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  const token = cleanToken(body?.token);
  if (!token) return json({ error: "token" }, 400);
  await getDb().delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, user.id)));
  return json({ ok: true });
}
