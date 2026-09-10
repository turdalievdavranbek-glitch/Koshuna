import type { AuthMethod, User } from "./types";

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
