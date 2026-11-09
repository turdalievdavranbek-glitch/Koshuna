import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { orders } from "./db/schema";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Fail = { error: string; status: number };

/** Still in progress for the buyer. A second checkout is refused. */
export const OPEN_ORDER = ["new", "accepted", "assembled", "assigned", "picked_up", "refused"] as const;

const NEW_CLIENT_SOM = 2000;
const NEW_CLIENT_ORDERS = 2;

/** One open order, and a new client stays under 2000 som until two deliveries. */
export async function guardBuyerOrder(tx: Tx, userId: string, totalSom: number): Promise<Fail | null> {
  const open = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.buyerId, userId), inArray(orders.status, [...OPEN_ORDER])))
    .limit(1);
  if (open[0]) return { error: "open-order", status: 409 };

  const done = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.buyerId, userId), eq(orders.status, "delivered")));
  if (Number(done[0]?.n ?? 0) >= NEW_CLIENT_ORDERS) return null;

  const used = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.buyerId, userId), notInArray(orders.status, ["cancelled", "rejected", "returned"])));
  if (Number(used[0]?.n ?? 0) >= NEW_CLIENT_ORDERS) return { error: "new-limit", status: 409 };
  if (totalSom > NEW_CLIENT_SOM) return { error: "new-limit", status: 409 };
  return null;
}
