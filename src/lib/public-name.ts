/** First word of the stored name, at most 40 characters. Never a phone or email. */
export function publicDisplayName(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return word.slice(0, 40);
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
