const HANDLE = /^[A-Za-z0-9_]{5,32}$/;

/** Owner-entered point Telegram. Strips @ and https://t.me/. Invalid or empty → null. */
export function telegramUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(/^https?:\/\/t\.me\//i, "");
  value = value.replace(/^@+/, "");
  value = value.split(/[/?#\s]/)[0] ?? "";
  if (!HANDLE.test(value)) return null;
  return value;
}

export function telegramLink(raw: string | null | undefined): string | null {
  const name = telegramUsername(raw);
  return name ? `https://t.me/${name}` : null;
}
