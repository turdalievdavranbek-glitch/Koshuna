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

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}
