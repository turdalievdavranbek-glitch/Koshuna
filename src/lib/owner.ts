import type { OrderStatus } from "./delivery";

/** The single Коңшу operator account. Same address as the public privacy contact. */
export const OWNER_EMAIL = "turdalievdavranbek@gmail.com";

export type StatsDay = { date: string; label: string; accounts: number; active: number; listings: number };

export type OwnerStats = {
  accounts: { total: number; today: number; days7: number; days30: number };
  active: { today: number; days7: number; days30: number };
  listings: { active: number; today: number; days7: number; days30: number; videos: number };
  shops: { total: number; days7: number };
  orders: { total: number; byStatus: { status: OrderStatus; label: string; count: number }[] };
  days: StatsDay[];
};

/** One registered account on the owner statistics page. No phone and no secrets. */
export type OwnerAccount = {
  email: string;
  name: string;
  /** Google, Email, Телефон, or another known method. Empty when the method is unknown. */
  method: string;
  /** Registration time in Asia/Bishkek, `dd.mm.yyyy hh:mm`. */
  registeredAt: string;
  /** Last visit in Asia/Bishkek, or empty when the account has no lastSeenAt. */
  lastSeenAt: string;
  listings: number;
  shop: boolean;
};

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}
