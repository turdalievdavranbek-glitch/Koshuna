/** Shapes returned by the chat API. No phone, WhatsApp, or email fields. */

export type ChatRole = "buy" | "sell";

export type ChatThread = {
  id: string;
  listingId: string | null;
  title: string;
  photo: string | null;
  peerId: string;
  peerName: string;
  role: ChatRole;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  requestQuantity?: string | null;
  requestUnit?: string | null;
};

export type ChatLine = {
  id: string;
  mine: boolean;
  /** Empty when deleted. */
  text: string;
  createdAt: string;
  editedAt?: string | null;
  deleted?: boolean;
};

export type ChatDetail = {
  id: string;
  listingId: string | null;
  title: string;
  photo: string | null;
  peerId: string;
  peerName: string;
  blocked: boolean;
  /** Listing section, so a service chat offers service quick replies. */
  section?: string | null;
  messages: ChatLine[];
  requestQuantity?: string | null;
  requestUnit?: string | null;
};

const SECRET_KEYS = new Set(["phone", "whatsapp", "email", "sellerPhone", "mediaUrl", "media_url"]);

/** Drop contact fields if a row is ever spread into a chat response. Message text is kept. */
export function sealChat<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sealChat(item)) as T;
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = sealChat(item);
  }
  return out as T;
}
