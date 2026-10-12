import { and, eq, isNull } from "drizzle-orm";
import type { SessionUser } from "./auth";
import { sessionIsAdmin } from "./auth";
import { getDb } from "./db";
import { userAuth, users } from "./db/schema";

/**
 * Admin editing someone else's listing or point: the save runs "as" the owner so ownership,
 * seller name and phone stay theirs. Returns null when `actor` is not an admin or the owner is gone.
 */
export async function ownerSessionForAdmin(actor: SessionUser, ownerId: string): Promise<SessionUser | null> {
  if (actor.id === ownerId) return actor;
  if (!(actor.isAdmin || (await sessionIsAdmin(actor.id)))) return null;
  const db = getDb();
  const rows = await db.select().from(users).where(and(eq(users.id, ownerId), isNull(users.deletedAt))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const auth = await db.select({ provider: userAuth.provider }).from(userAuth).where(eq(userAuth.userId, ownerId)).limit(1);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: row.createdAt,
    lang: row.lang,
    city: row.city,
    district: row.district,
    telegram: row.telegram,
    method: auth[0]?.provider ?? "google",
    isAdmin: row.isAdmin === true,
    isMaster: row.isMaster === true,
  };
}

export function auditAdminEdit(kind: "listing" | "point", id: string, adminId: string, ownerId: string): void {
  console.info("[audit] admin-edit", JSON.stringify({ at: new Date().toISOString(), kind, id, admin: adminId, owner: ownerId }));
}
