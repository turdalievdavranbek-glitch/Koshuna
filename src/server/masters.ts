import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";

/** Public ids of «Мастер-аккаунт» users, for the badge. A short list. */
export async function masterIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isMaster, true), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(500);
  return rows.map((row) => row.id);
}

/** Master or admin: may run points for sellers and has no personal daily limit. */
export async function isMasterOrAdmin(userId: string): Promise<boolean> {
  const rows = await getDb().select({ isAdmin: users.isAdmin, isMaster: users.isMaster }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.isAdmin === true || rows[0]?.isMaster === true;
}

export async function setMaster(adminId: string, userId: string, on: boolean): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  const rows = await db.update(users).set({ isMaster: on, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!rows[0]) return { error: "not-found", status: 404 };
  console.info("[audit] master-account", JSON.stringify({ at: new Date().toISOString(), admin: adminId, user: userId, on }));
  return { ok: true };
}
