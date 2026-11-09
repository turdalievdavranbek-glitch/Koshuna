const MIN = 8;
const MAX = 400;

/** A readable refusal. Empty, tiny, or huge text is rejected. */
export function courierRejectReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < MIN || text.length > MAX) return null;
  return text;
}
