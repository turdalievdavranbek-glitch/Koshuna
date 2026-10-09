import { readFileSync } from "node:fs";
import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { importPKCS8, SignJWT } from "jose";
import { PUSH_CHANNEL_ID, pushPathForNotice } from "@/lib/push-path";
import { getDb } from "./db";
import { blocks, notifications, pushTokens, users } from "./db/schema";
import { pushCopy, pushLang, type PushCopyInput } from "./push-text";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CHAT_PUSH_GAP_MS = 30_000;

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

export type NoticePush = PushCopyInput & {
  noticeId: string;
  userId: string;
  type: string;
  listingId?: string | null;
  threadId?: string | null;
  requestId?: string | null;
  actorId?: string | null;
};

let missingLogged = false;
let oauthLogged = false;
let cached: { token: string; exp: number } | null = null;
let inflight: Promise<string | null> | null = null;
const threadPushAt = new Map<string, number>();

function logMissingOnce(reason: string): void {
  if (missingLogged) return;
  missingLogged = true;
  console.warn(`Push skipped: ${reason}`);
}

function readAccountText(): string {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  if (inline) return inline.replace(/^\uFEFF/, "");
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim() ?? "";
  if (!file) return "";
  try {
    return readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim();
  } catch {
    logMissingOnce("FIREBASE_SERVICE_ACCOUNT_FILE cannot be read");
    return "";
  }
}

function loadServiceAccount(): ServiceAccount | null {
  const text = readAccountText();
  if (!text) {
    logMissingOnce("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    logMissingOnce("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    logMissingOnce("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
  const row = parsed as Record<string, unknown>;
  const clientEmail = typeof row.client_email === "string" ? row.client_email.trim() : "";
  let privateKey = typeof row.private_key === "string" ? row.private_key : "";
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  const projectId =
    (typeof row.project_id === "string" && row.project_id.trim()) || "konshu-cbb9e";
  const tokenUri = typeof row.token_uri === "string" ? row.token_uri.trim() : "";
  if (!clientEmail || !privateKey.includes("BEGIN")) {
    logMissingOnce("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
    return null;
  }
  return { client_email: clientEmail, private_key: privateKey, project_id: projectId, token_uri: tokenUri || undefined };
}

async function fetchAccessToken(account: ServiceAccount): Promise<string | null> {
  try {
    const key = await importPKCS8(account.private_key, "RS256");
    const assertion = await new SignJWT({ scope: FCM_SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(account.client_email)
      .setSubject(account.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    const res = await fetch(account.token_uri || TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      if (!oauthLogged) {
        oauthLogged = true;
        console.warn("Push skipped: Google OAuth for FCM failed");
      }
      return null;
    }
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    const expiresIn = (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
    cached = { token: body.access_token, exp: Date.now() + expiresIn };
    return body.access_token;
  } catch {
    if (!oauthLogged) {
      oauthLogged = true;
      console.warn("Push skipped: Google OAuth for FCM failed");
    }
    return null;
  }
}

async function accessToken(account: ServiceAccount, force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && cached && cached.exp - 60_000 > now) return cached.token;
  if (force) cached = null;
  if (!inflight) {
    inflight = fetchAccessToken(account).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function blockedCounterparts(userId: string, others: string[]): Promise<Set<string>> {
  const ids = [...new Set(others.filter((id) => id && id !== userId))];
  if (!ids.length) return new Set();
  const rows = await getDb()
    .select({ blockerId: blocks.blockerId, blockedUserId: blocks.blockedUserId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, userId), inArray(blocks.blockedUserId, ids)),
        and(eq(blocks.blockedUserId, userId), inArray(blocks.blockerId, ids)),
      ),
    );
  const blocked = new Set<string>();
  for (const row of rows) {
    blocked.add(row.blockerId === userId ? row.blockedUserId : row.blockerId);
  }
  return blocked;
}

async function pairBlocked(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return a === b;
  const hit = await blockedCounterparts(a, [b]);
  return hit.has(b);
}

function pruneThreads(now: number): void {
  if (threadPushAt.size < 4000) return;
  for (const [key, at] of threadPushAt) {
    if (now - at > CHAT_PUSH_GAP_MS) threadPushAt.delete(key);
  }
}

/** At most one chat push per thread per 30s, in this process and via push_sent_at. */
async function allowChatThread(threadId: string): Promise<boolean> {
  const now = Date.now();
  pruneThreads(now);
  const prev = threadPushAt.get(threadId) ?? 0;
  if (now - prev < CHAT_PUSH_GAP_MS) return false;
  threadPushAt.set(threadId, now);
  const since = new Date(now - CHAT_PUSH_GAP_MS);
  const recent = await getDb()
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "chat_message"),
        gt(notifications.pushSentAt, since),
        sql`${notifications.params}->>'threadId' = ${threadId}`,
      ),
    )
    .limit(1);
  return !recent[0];
}

type FcmResult = "ok" | "stale" | "fail";

async function fcmErrorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { status?: string; details?: Array<{ errorCode?: string }> };
    };
    const coded = body.error?.details?.find((row) => row.errorCode)?.errorCode;
    return coded || body.error?.status || "";
  } catch {
    return "";
  }
}

async function sendOne(
  account: ServiceAccount,
  bearer: string,
  token: string,
  title: string,
  body: string,
  path: string,
): Promise<{ result: FcmResult; status: number }> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { path },
        android: {
          priority: "HIGH",
          notification: {
            channel_id: PUSH_CHANNEL_ID,
            sound: "default",
          },
        },
      },
    }),
  });
  if (res.ok) return { result: "ok", status: res.status };
  const code = await fcmErrorCode(res);
  if (res.status === 404 || code === "UNREGISTERED") return { result: "stale", status: res.status };
  return { result: "fail", status: res.status };
}

async function markPush(noticeId: string, sent: boolean, error: string | null): Promise<void> {
  await getDb()
    .update(notifications)
    .set({
      pushSentAt: sent ? new Date() : null,
      pushError: error,
    })
    .where(eq(notifications.id, noticeId));
}

/** Sends one notice to the user's native tokens. No-op when FCM credentials are unset. */
export async function deliverPush(job: NoticePush): Promise<void> {
  const account = loadServiceAccount();
  if (!account) return;
  if (job.actorId && (await pairBlocked(job.actorId, job.userId))) return;

  const db = getDb();
  const person = await db.select({ lang: users.lang }).from(users).where(eq(users.id, job.userId)).limit(1);
  const text = pushCopy(pushLang(person[0]?.lang), job);
  if (!text.title || !text.body) return;
  const path = pushPathForNotice({
    threadId: job.threadId,
    requestId: job.requestId,
    listingId: job.listingId,
  });

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, job.userId));
  if (!tokens.length) return;

  const threadId = job.type === "chat_message" ? job.threadId : null;
  if (threadId && !(await allowChatThread(threadId))) return;

  const bearer = await accessToken(account);
  if (!bearer) {
    if (threadId) threadPushAt.delete(threadId);
    await markPush(job.noticeId, false, "oauth").catch(() => undefined);
    return;
  }
  let current = bearer;

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];
  for (const row of tokens) {
    try {
      let outcome = await sendOne(account, current, row.token, text.title, text.body, path);
      if (outcome.status === 401) {
        const fresh = await accessToken(account, true);
        if (!fresh) {
          failed += 1;
          continue;
        }
        current = fresh;
        outcome = await sendOne(account, current, row.token, text.title, text.body, path);
      }
      if (outcome.result === "ok") sent += 1;
      else if (outcome.result === "stale") stale.push(row.token);
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  if (stale.length) {
    await db.delete(pushTokens).where(inArray(pushTokens.token, stale));
  }
  const error = sent > 0 ? null : stale.length && !failed ? "unregistered" : failed ? "fcm" : null;
  await markPush(job.noticeId, sent > 0, error).catch(() => undefined);
}
