/** First word of the stored name, at most 40 characters. Never a phone or email. */
export function publicDisplayName(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return word.slice(0, 40);
}

/** First name for a hold request. Empty when the account has no name, or the word is a phone or email. */
export function holdPersonName(name: string | null | undefined): string {
  const word = publicDisplayName(name);
  if (!word || word.includes("@")) return "";
  const compact = word.replace(/[\s\-()+]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length >= 6 && digits.length >= compact.length - 1) return "";
  return word;
}

export function buildPublicProfile(
  row: { id: string; name: string; createdAt: Date },
  activeListings: number,
): { id: string; name: string; joinedYear: number; activeListings: number } {
  return {
    id: row.id,
    name: publicDisplayName(row.name),
    joinedYear: row.createdAt.getFullYear(),
    activeListings,
  };
}
