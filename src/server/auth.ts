/**
 * Шаг 8 plug-in contract: real Telegram/Google/Apple/TikTok/SMS login adds one route per provider that verifies the provider token and calls `signInWithIdentity({ provider: '<name>', providerUserId: '<provider id>', profile })`. Linking a second provider to a signed-in user inserts another `user_auth` row for the same `user_id`. No change to `users`, `sessions`, the cookie, or `getSessionUser` is needed. Turning off the demo path = `AUTH_DEMO_ENABLED=false`.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { sessions, userAuth, users } from "./db/schema";

const NINETY_DAYS_SEC = 90 * 24 * 60 * 60;
const HOUR_MS = 60 * 60 * 1000;

export type AuthProvider = "demo" | "sms" | "telegram" | "google" | "apple" | "tiktok";

export type SessionUser = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  lang: string;
  city: string | null;
  district: string | null;
  method: string;
};

export function assertSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  }
  return secret;
}

function tokenHash(token: string): string {
  return createHmac("sha256", assertSessionSecret()).update(token).digest("hex");
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ksid=${token}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=${NINETY_DAYS_SEC}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ksid=; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=0`;
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function jobsSecretOk(header: string | null): boolean {
  const secret = process.env.JOBS_SECRET ?? "";
  if (!secret || !header) return false;
  return safeEqual(header, secret);
}

async function latestMethod(userId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ provider: userAuth.provider })
    .from(userAuth)
    .where(eq(userAuth.userId, userId))
    .orderBy(desc(userAuth.createdAt))
    .limit(1);
  return rows[0]?.provider ?? "demo";
}

export async function createSession(userId: string, userAgent: string | null): Promise<{ token: string; cookie: string }> {
  assertSessionSecret();
  const token = randomBytes(32).toString("base64url");
  const id = tokenHash(token);
  const expiresAt = new Date(Date.now() + NINETY_DAYS_SEC * 1000);
  await getDb().insert(sessions).values({
    id,
    userId,
    expiresAt,
    lastSeenAt: new Date(),
    userAgent,
  });
  return { token, cookie: sessionCookie(token) };
}

export async function signInWithIdentity(input: {
  provider: AuthProvider;
  providerUserId: string;
  profile: { name?: string; phone?: string; email?: string };
  userAgent?: string | null;
}): Promise<{ user: SessionUser; cookie: string }> {
  assertSessionSecret();
  const db = getDb();
  const row = await db.transaction(async (tx) => {
    const found = await tx
      .select()
      .from(userAuth)
      .where(and(eq(userAuth.provider, input.provider), eq(userAuth.providerUserId, input.providerUserId)))
      .limit(1);
    if (!found[0]) {
      const [created] = await tx
        .insert(users)
        .values({
          name: input.profile.name?.trim() || "",
          phone: input.profile.phone?.trim() || null,
          email: input.profile.email?.trim() || null,
        })
        .returning();
      await tx.insert(userAuth).values({
        userId: created.id,
        provider: input.provider,
        providerUserId: input.providerUserId,
      });
      return created;
    }
    const [current] = await tx.select().from(users).where(eq(users.id, found[0].userId)).limit(1);
    if (!current || current.deletedAt || current.bannedAt) {
      throw new Error("account-unavailable");
    }
    const patch: Partial<typeof users.$inferInsert> = {};
    if (!current.name && input.profile.name?.trim()) patch.name = input.profile.name.trim();
    if (!current.phone && input.profile.phone?.trim()) patch.phone = input.profile.phone.trim();
    if (!current.email && input.profile.email?.trim()) patch.email = input.profile.email.trim();
    if (Object.keys(patch).length) {
      patch.updatedAt = new Date();
      const [updated] = await tx.update(users).set(patch).where(eq(users.id, current.id)).returning();
      return updated;
    }
    return current;
  });
  const { cookie } = await createSession(row.id, input.userAgent ?? null);
  return {
    user: {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      lang: row.lang,
      city: row.city,
      district: row.district,
      method: input.provider,
    },
    cookie,
  };
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req, "ksid");
  if (!token) return null;
  let id: string;
  try {
    id = tokenHash(token);
  } catch {
    return null;
  }
  const db = getDb();
  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(1);
  const hit = rows[0];
  if (!hit) return null;
  const seen = hit.session.lastSeenAt?.getTime() ?? 0;
  if (Date.now() - seen > HOUR_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, hit.session.id));
  }
  return {
    id: hit.user.id,
    name: hit.user.name,
    phone: hit.user.phone,
    email: hit.user.email,
    createdAt: hit.user.createdAt,
    lang: hit.user.lang,
    city: hit.user.city,
    district: hit.user.district,
    method: await latestMethod(hit.user.id),
  };
}

export async function destroySession(req: Request): Promise<void> {
  const token = readCookie(req, "ksid");
  if (!token) return;
  try {
    const id = tokenHash(token);
    await getDb().delete(sessions).where(eq(sessions.id, id));
  } catch {
    /* missing secret or bad cookie: nothing to clear in the database */
  }
}
