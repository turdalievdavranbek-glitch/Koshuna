import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { feedback, users } from "./db/schema";
import { sendMail } from "./mail";

const FEEDBACK_EMAIL = "turdalievdavranbek@gmail.com";

export const FEEDBACK_TOPICS = ["publish", "bug", "idea", "other"] as const;
const MAX_TEXT = 4000;
const MAX_PHOTO = 1_600_000;
const MAX_VOICE = 1_200_000;

export type FeedbackInput = {
  text?: unknown;
  topic?: unknown;
  contact?: unknown;
  pageUrl?: unknown;
  platform?: unknown;
  appVersion?: unknown;
  photo?: unknown;
  voice?: unknown;
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function dataUrl(value: unknown, prefix: string, max: number): string | null {
  if (typeof value !== "string" || !value) return null;
  if (!value.startsWith(prefix) || value.length > max) return null;
  if (!/^data:[a-z]+\/[a-z0-9.+-]+(;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$/i.test(value)) return null;
  return value;
}

export async function createFeedback(userId: string | null, input: FeedbackInput): Promise<{ ok: true } | { error: string }> {
  const text = str(input.text, MAX_TEXT);
  const topicRaw = str(input.topic, 20);
  const topic = (FEEDBACK_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : null;
  const photo = ["data:image/jpeg", "data:image/png", "data:image/webp"].some((p) => typeof input.photo === "string" && input.photo.startsWith(p))
    ? dataUrl(input.photo, "data:image/", MAX_PHOTO)
    : null;
  const voice = dataUrl(input.voice, "data:audio/", MAX_VOICE);
  if (!text && !photo && !voice && !topic) return { error: "empty" };
  const platform = str(input.platform, 20);
  const db = getDb();
  const contact = str(input.contact, 200) || null;
  const pageUrl = str(input.pageUrl, 500) || null;
  const appVersion = str(input.appVersion, 40) || null;
  const plat = ["android", "ios", "web"].includes(platform) ? platform : "web";
  const [row] = await db
    .insert(feedback)
    .values({ userId, text, topic, contact, pageUrl, platform: plat, appVersion, photoData: photo, voiceData: voice })
    .returning({ id: feedback.id });
  const who = userId
    ? (await db.select({ name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0]
    : undefined;
  const attachments: Array<{ filename: string; path: string }> = [];
  if (photo) attachments.push({ filename: "photo.jpg", path: photo });
  if (voice) attachments.push({ filename: voice.includes("mp4") ? "voice.m4a" : "voice.webm", path: voice });
  const body = [
    text || "(без текста)",
    "",
    `Тема: ${topic ?? "—"}`,
    `Контакт: ${contact ?? "—"}`,
    `Пользователь: ${userId ? `${who?.name ?? ""} ${who?.phone ?? ""} ${who?.email ?? ""} (id ${userId})` : "гость"}`,
    `Страница: ${pageUrl ?? "—"}`,
    `Платформа: ${plat}${appVersion ? ` ${appVersion}` : ""}`,
    `Обращение: ${row?.id ?? ""}`,
  ].join("\n");
  const subject = `Коңшу — обратная связь: ${(text || topic || "без текста").replace(/\s+/g, " ").slice(0, 60)}`;
  void sendMail({ to: FEEDBACK_EMAIL, subject, text: body, attachments }).catch((err) => {
    console.error("feedback mail", err instanceof Error ? err.message : "failed");
  });
  return { ok: true };
}

export async function listFeedback() {
  const rows = await getDb()
    .select({
      id: feedback.id,
      userId: feedback.userId,
      userName: users.name,
      text: feedback.text,
      topic: feedback.topic,
      contact: feedback.contact,
      pageUrl: feedback.pageUrl,
      platform: feedback.platform,
      appVersion: feedback.appVersion,
      hasPhoto: feedback.photoData,
      hasVoice: feedback.voiceData,
      status: feedback.status,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .leftJoin(users, eq(users.id, feedback.userId))
    .orderBy(desc(feedback.createdAt))
    .limit(200);
  return rows.map((row) => ({
    ...row,
    hasPhoto: Boolean(row.hasPhoto),
    hasVoice: Boolean(row.hasVoice),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function setFeedbackStatus(id: string, status: string): Promise<boolean> {
  if (status !== "new" && status !== "handled") return false;
  const rows = await getDb().update(feedback).set({ status }).where(eq(feedback.id, id)).returning({ id: feedback.id });
  return rows.length > 0;
}

export async function feedbackFile(id: string, kind: string): Promise<{ mime: string; body: Buffer } | null> {
  const rows = await getDb()
    .select({ photo: feedback.photoData, voice: feedback.voiceData })
    .from(feedback)
    .where(eq(feedback.id, id))
    .limit(1);
  const value = kind === "voice" ? rows[0]?.voice : rows[0]?.photo;
  if (!value) return null;
  const comma = value.indexOf(",");
  const mime = value.slice(5, comma).split(";")[0] || "application/octet-stream";
  return { mime, body: Buffer.from(value.slice(comma + 1), "base64") };
}
