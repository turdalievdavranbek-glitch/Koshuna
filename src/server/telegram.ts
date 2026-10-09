/**
 * Telegram login (Шаг 8б). The bot token is read only from TELEGRAM_BOT_TOKEN.
 * Never log the token, the Bot API URL, or put either in a response.
 *
 * Pending app logins live in this process. pm2 runs one fork, so a short-lived
 * in-memory store is enough. If pm2 ever runs >1 instance, move this to the DB.
 * A pm2 reload drops pending logins; the user simply taps again.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { signInWithIdentity, readCookie, type SessionUser } from "./auth";

const REQUEST_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_PER_IP = 5;
const AUTH_MAX_AGE_SEC = 60 * 60;
const AUTH_FUTURE_SKEW_SEC = 5 * 60;

const ID_RE = /^[A-Za-z0-9_-]{22,64}$/;
const USERNAME_RE = /^[A-Za-z0-9_]{5,32}$/;

export const CONFIRM_TEXT = [
  "Вход в Коңшу. Нажмите «Подтвердить», если это вы входите в приложение. Если вы ничего не нажимали в Коңшу — просто закройте это сообщение.",
  "",
  "Коңшуга кирүү. Эгер тиркемеге өзүңүз кирип жатсаңыз, «Ырастоо» басыңыз. Эгер Коңшуда эч нерсе баспасаңыз — бул билдирүүнү жабыңыз.",
].join("\n");

export const DONE_TEXT = ["Готово! Вернитесь в приложение Коңшу.", "", "Даяр! Коңшу тиркемесине кайтыңыз."].join("\n");

/** Opens the installed app on this path (App Link). The website page only finishes login or goes home. */
export const TELEGRAM_RETURN_URL = "https://koshuna.ru/auth/telegram/back";

export function telegramReturnKeyboard(): { inline_keyboard: Array<Array<{ text: string; url: string }>> } {
  return {
    inline_keyboard: [
      [{ text: "Вернуться в Коңшу", url: TELEGRAM_RETURN_URL }],
      [{ text: "Коңшуга кайтуу", url: TELEGRAM_RETURN_URL }],
    ],
  };
}

export const EXPIRED_TEXT = [
  "Ссылка устарела, нажмите «Войти через Telegram» ещё раз",
  "",
  "Шилтеме эскирди. «Telegram аркылуу кирүү» баскычын кайра басыңыз.",
].join("\n");

export const START_TEXT = [
  "Откройте Коңшу и нажмите «Войти через Telegram»",
  "",
  "Коңшуну ачыңыз жана «Telegram аркылуу кирүү» баскычын басыңыз",
].join("\n");

type LoginRow = {
  status: "pending" | "confirmed";
  createdAt: number;
  ip: string;
  user?: { id: string; firstName: string };
  consumed?: boolean;
};

const logins = new Map<string, LoginRow>();

type BotResult = { ok?: boolean; result?: { message_id?: number }; description?: string };
type BotCall = (method: string, body: Record<string, unknown>) => Promise<BotResult>;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function telegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || "").trim();
}

export function telegramBotUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, "");
}

export function telegramBotId(token = telegramBotToken()): string | null {
  const id = token.split(":")[0] || "";
  return /^\d{5,}$/.test(id) ? id : null;
}

export function telegramPublicConfig(): { enabled: boolean; botUsername: string | null; botId: string | null } {
  const token = telegramBotToken();
  const username = telegramBotUsername();
  const enabled = Boolean(token && USERNAME_RE.test(username));
  if (!enabled) return { enabled: false, botUsername: null, botId: null };
  return { enabled: true, botUsername: username, botId: telegramBotId(token) };
}

export function publicAuthConfig(): {
  google: { clientId: string | null };
  telegram: { enabled: boolean; botUsername: string | null; botId: string | null };
} {
  const fromServer = (process.env.GOOGLE_WEB_CLIENT_ID || "").trim();
  const fromPublic = (process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();
  return {
    google: { clientId: fromServer || fromPublic || null },
    telegram: telegramPublicConfig(),
  };
}

export function publicOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host).split(",")[0].trim();
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded ? forwarded.split(",")[0].trim() : url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === publicOrigin(req);
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f\\]/.test(path) || path.includes("://")) return "/";
  return path;
}

function secureSuffix(): string {
  return "; Secure";
}

export function telegramRequestCookie(id: string): string {
  return `ktg=${id}; HttpOnly; Path=/api/auth/telegram; SameSite=Lax${secureSuffix()}; Max-Age=600`;
}

export function clearTelegramRequestCookie(): string {
  return `ktg=; HttpOnly; Path=/api/auth/telegram; SameSite=Lax${secureSuffix()}; Max-Age=0`;
}

export function clearTelegramDestCookie(): string {
  return `ktgdest=; Path=/; SameSite=Lax${secureSuffix()}; Max-Age=0`;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const ip = fwd.split(",")[0]?.trim();
    if (ip) return ip.slice(0, 80);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 80) : "unknown";
}

function sweep(now = Date.now()): void {
  for (const [id, row] of logins) {
    if (now - row.createdAt > REQUEST_TTL_MS) logins.delete(id);
  }
}

export function resetTelegramLoginsForTests(): void {
  logins.clear();
}

export function newTelegramRequestId(): string {
  return randomBytes(16).toString("base64url");
}

function pendingCount(ip: string, now: number): number {
  let count = 0;
  for (const row of logins.values()) {
    if (row.ip === ip && row.status === "pending" && now - row.createdAt <= REQUEST_TTL_MS) count += 1;
  }
  return count;
}

export function telegramDataCheckString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");
}

export function telegramLoginHash(dataCheckString: string, botToken: string): string {
  const secret = createHash("sha256").update(botToken).digest();
  return createHmac("sha256", secret).update(dataCheckString).digest("hex");
}

export function verifyTelegramLogin(
  params: Record<string, string>,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): { id: string; firstName: string } | null {
  const hash = params.hash || "";
  if (!botToken || !hash) return null;
  const id = params.id || "";
  if (!/^\d+$/.test(id)) return null;
  const authDate = Number(params.auth_date);
  if (!Number.isFinite(authDate) || !Number.isInteger(authDate)) return null;
  if (nowSec - authDate > AUTH_MAX_AGE_SEC) return null;
  if (authDate - nowSec > AUTH_FUTURE_SKEW_SEC) return null;
  const expected = telegramLoginHash(telegramDataCheckString(params), botToken);
  if (!safeEqual(expected, hash.toLowerCase())) return null;
  const firstName = (params.first_name || "").trim().slice(0, 80);
  return { id, firstName };
}

export type StartResult =
  | { status: 200; link: string; cookie: string }
  | { status: 403 | 429 | 503 };

export function beginTelegramAppLogin(req: Request): StartResult {
  const config = telegramPublicConfig();
  if (!config.enabled || !config.botUsername) return { status: 503 };
  if (!originAllowed(req)) return { status: 403 };
  const now = Date.now();
  sweep(now);
  const ip = clientIp(req);
  if (pendingCount(ip, now) >= MAX_PENDING_PER_IP) return { status: 429 };
  const id = newTelegramRequestId();
  logins.set(id, { status: "pending", createdAt: now, ip });
  return {
    status: 200,
    link: `https://t.me/${config.botUsername}?start=${id}`,
    cookie: telegramRequestCookie(id),
  };
}

async function defaultBotCall(method: string, body: Record<string, unknown>): Promise<BotResult> {
  const token = telegramBotToken();
  if (!token) return { ok: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return (await res.json().catch(() => ({ ok: false }))) as BotResult;
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

export const telegramApi: { call: BotCall } = {
  call: defaultBotCall,
};

async function bot(method: string, body: Record<string, unknown>): Promise<void> {
  try {
    await telegramApi.call(method, body);
  } catch {
    /* The token and the request URL stay out of logs and responses. */
  }
}

function confirmKeyboard(id: string): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return {
    inline_keyboard: [
      [{ text: "Подтвердить вход", callback_data: `ok:${id}` }],
      [{ text: "Кирүүнү ырастоо", callback_data: `ok:${id}` }],
    ],
  };
}

type TgFrom = { id?: number; first_name?: string; is_bot?: boolean };

function person(from: TgFrom | undefined): { id: string; firstName: string } | null {
  if (!from || from.is_bot === true) return null;
  if (typeof from.id !== "number" || !Number.isFinite(from.id)) return null;
  return { id: String(from.id), firstName: (from.first_name || "").trim().slice(0, 80) };
}

export async function handleTelegramUpdate(update: unknown): Promise<void> {
  sweep();
  if (!update || typeof update !== "object") return;
  const body = update as {
    message?: { text?: string; chat?: { id?: number; type?: string }; from?: TgFrom };
    callback_query?: {
      id?: string;
      data?: string;
      from?: TgFrom;
      message?: { message_id?: number; chat?: { id?: number; type?: string } };
    };
  };

  const message = body.message;
  if (message?.chat?.type === "private" && typeof message.chat.id === "number" && typeof message.text === "string") {
    const who = person(message.from);
    if (!who) return;
    const payload = message.text.match(/^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/);
    if (!payload) return;
    const raw = payload[1];
    if (!raw) {
      await bot("sendMessage", { chat_id: message.chat.id, text: START_TEXT });
      return;
    }
    const started = ID_RE.test(raw) ? raw : null;
    const row = started ? logins.get(started) : undefined;
    if (!started || !row || row.status !== "pending") {
      await bot("sendMessage", { chat_id: message.chat.id, text: EXPIRED_TEXT });
      return;
    }
    await bot("sendMessage", {
      chat_id: message.chat.id,
      text: CONFIRM_TEXT,
      reply_markup: confirmKeyboard(started),
    });
    return;
  }

  const query = body.callback_query;
  if (!query) return;
  const who = person(query.from);
  const data = typeof query.data === "string" ? query.data : "";
  const match = data.match(/^ok:([A-Za-z0-9_-]{22,64})$/);
  const callbackId = typeof query.id === "string" ? query.id : "";
  if (!who || !match) {
    if (callbackId) await bot("answerCallbackQuery", { callback_query_id: callbackId });
    return;
  }
  const id = match[1];
  const row = logins.get(id);
  const chat = query.message?.chat;
  const privateChat = !chat || chat.type === "private";
  if (!row || !privateChat) {
    if (callbackId) {
      await bot("answerCallbackQuery", { callback_query_id: callbackId, text: EXPIRED_TEXT, show_alert: true });
    }
    return;
  }
  if (row.status === "pending") {
    row.status = "confirmed";
    row.user = who;
  }
  if (callbackId) await bot("answerCallbackQuery", { callback_query_id: callbackId });
  const messageId = query.message?.message_id;
  const chatId = chat?.id;
  if (typeof messageId === "number" && typeof chatId === "number") {
    await bot("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: DONE_TEXT,
      reply_markup: telegramReturnKeyboard(),
    });
  }
}

export function telegramWebhookAuthorized(header: string | null): boolean {
  const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!secret || !header) return false;
  return safeEqual(header, secret);
}

export async function handleTelegramWebhook(req: Request): Promise<{ status: 200 | 401 }> {
  if (!telegramWebhookAuthorized(req.headers.get("x-telegram-bot-api-secret-token"))) return { status: 401 };
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  await handleTelegramUpdate(body);
  return { status: 200 };
}

export type PollResult =
  | { ok: false; status: "pending" }
  | { ok: false; status: "expired" | "blocked" | "error"; clearCookie: true }
  | { ok: true; clearCookie: true; cookie: string; user: SessionUser; isNew: boolean };

export async function pollTelegramLogin(
  id: string | null,
  userAgent: string | null,
  signIn: typeof signInWithIdentity = signInWithIdentity,
): Promise<PollResult> {
  sweep();
  if (!id || !ID_RE.test(id)) return { ok: false, status: "expired", clearCookie: true };
  const row = logins.get(id);
  if (!row) return { ok: false, status: "expired", clearCookie: true };
  if (row.status === "pending" || row.consumed) return { ok: false, status: "pending" };
  if (row.status !== "confirmed" || !row.user) return { ok: false, status: "expired", clearCookie: true };
  row.consumed = true;
  try {
    const signed = await signIn({
      provider: "telegram",
      providerUserId: row.user.id,
      profile: { name: row.user.firstName },
      userAgent,
    });
    logins.delete(id);
    return { ok: true, clearCookie: true, cookie: signed.cookie, user: signed.user, isNew: signed.isNew };
  } catch (err) {
    logins.delete(id);
    const blocked = err instanceof Error && err.message === "account-unavailable";
    return { ok: false, status: blocked ? "blocked" : "error", clearCookie: true };
  }
}

export function telegramRequestIdFrom(req: Request): string | null {
  return readCookie(req, "ktg");
}
