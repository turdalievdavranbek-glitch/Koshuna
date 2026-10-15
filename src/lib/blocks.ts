/** True when this viewer should not see the author's listings and points. */
export function hiddenByBlock(
  ownerId: string | null | undefined,
  blockedIds: readonly string[],
  viewerId?: string | null,
): boolean {
  if (!ownerId || !viewerId || ownerId === viewerId) return false;
  return blockedIds.includes(ownerId);
}

/**
 * The listing owner blocked the person asking for the number.
 * Direction matters: the requester blocking the owner is a different rule.
 */
export function ownerBlockedRequester(
  rows: readonly { blockerId: string; blockedUserId: string }[],
  ownerId: string,
  requesterId: string,
): boolean {
  return rows.some((row) => row.blockerId === ownerId && row.blockedUserId === requesterId);
}
