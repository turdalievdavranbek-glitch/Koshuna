/** Stored form is +<digits>. Kyrgyz numbers become +996 and 9 digits. */
export function normalizePhoneInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (!hasPlus && digits.length === 10 && digits.startsWith("0")) {
    return `+996${digits.slice(1)}`;
  }
  if (!hasPlus && digits.length === 9) {
    return `+996${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("996")) {
    return `+${digits}`;
  }
  if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

/** +996 555 12 34 56. Other countries stay +<digits>. */
export function formatPhoneDisplay(phone: string): string {
  const normalized = phone.startsWith("+") ? phone : normalizePhoneInput(phone) ?? phone;
  if (/^\+996\d{9}$/.test(normalized)) {
    const d = normalized.slice(4);
    return `+996 ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
  return normalized;
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Database user ids are UUIDs. Demo listings use short ids such as "aida" or "seed". */
export function isDbUserId(id?: string | null): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}
