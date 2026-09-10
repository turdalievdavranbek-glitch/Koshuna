import { ownerById } from "./data";
import type { AuthMethod, Listing, Owner, User } from "./types";
import { isOwnListing } from "./listing-owner";

export type TrustStars = 0 | 1 | 2 | 3;

export function starsForAuth(method: AuthMethod | undefined, cardLinked?: boolean): TrustStars {
  if (!method || method === "email") return 0;
  if (method === "sms") return cardLinked ? 3 : 2;
  return 1;
}

export function starsForUser(user: Pick<User, "method" | "cardLinked"> | null | undefined): TrustStars {
  if (!user) return 0;
  return starsForAuth(user.method, user.cardLinked);
}

export function starsForOwner(owner: Pick<Owner, "method" | "cardLinked"> | null | undefined): TrustStars {
  if (!owner) return 0;
  return starsForAuth(owner.method, owner.cardLinked);
}

export function starsForListing(
  listing: { id: string; ownerId: string },
  extra: Listing[],
  user: User | null,
): TrustStars {
  if (isOwnListing(listing, extra, user)) return starsForUser(user);
  return starsForOwner(ownerById(listing.ownerId));
}
