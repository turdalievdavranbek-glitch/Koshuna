import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { CITIES, DISTRICTS } from "@/lib/data";
import { isCourierTransport, type CourierTransport } from "@/lib/delivery";
import { OWNER_EMAIL } from "@/lib/owner";
import { isDbUserId } from "@/lib/phone";
import { getDb } from "./db";
import { courierApplications, orders, users } from "./db/schema";
import { sessionIsAdmin, sessionIsOwner } from "./auth";
import { releaseAssignedOrders } from "./delivery";
import { removePrivate } from "./courier-files";
import { bindNoticePushes, saveNotice } from "./notices";

type Fail = { error: string; status: number };

export type CourierMine = {
  courier: boolean;
  online: boolean;
  blocked: boolean;
  city: string | null;
  district: string | null;
  application: { status: "pending" | "approved" | "revoked"; name: string; phone: string; district: string; transport: CourierTransport } | null;
};

function isDeliveryCity(value: string): boolean {
  return value !== "all" && (CITIES as readonly string[]).includes(value);
}

function districtInCity(districtId: string, city: string): boolean {
  return DISTRICTS.some((row) => row.id === districtId && row.city === city);
}

/** Admin or the single owner account. Courier photos and approve/revoke stay behind this. */
export async function canReviewCouriers(userId: string): Promise<boolean> {
  return (await sessionIsAdmin(userId)) || (await sessionIsOwner(userId));
}

export async function courierIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isCourier, true), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(500);
  return rows.map((row) => row.id);
}

export async function myCourier(userId: string): Promise<CourierMine> {
  const db = getDb();
  const who = await db
    .select({
      courier: users.isCourier,
      online: users.courierOnline,
      blocked: users.orderBlocked,
      city: users.courierCity,
      district: users.courierDistrict,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const app = await db.select().from(courierApplications).where(eq(courierApplications.userId, userId)).limit(1);
  const row = app[0];
  const transport = row && isCourierTransport(row.transport) ? row.transport : null;
  const status = row?.status === "pending" || row?.status === "approved" || row?.status === "revoked" ? row.status : null;
  return {
    courier: who[0]?.courier === true,
    online: who[0]?.online === true,
    blocked: who[0]?.blocked === true,
    city: who[0]?.city ?? null,
    district: who[0]?.district ?? null,
    application:
      row && transport && status
        ? { status, name: row.name, phone: row.phone, district: row.district, transport }
        : null,
  };
}

export async function saveCourierApplication(
  userId: string,
  input: { name: string; phone: string; district: string; transport: CourierTransport; passportPath: string; selfiePath: string; acceptedRulesAt: Date },
): Promise<{ ok: true; previous: string[] } | Fail> {
  const db = getDb();
  const existing = await db.select().from(courierApplications).where(eq(courierApplications.userId, userId)).limit(1);
  if (existing[0]?.status === "approved") return { error: "approved", status: 409 };
  const previous = existing[0] ? [existing[0].passportPath, existing[0].selfiePath] : [];
  if (existing[0]) {
    await db
      .update(courierApplications)
      .set({
        name: input.name,
        phone: input.phone,
        district: input.district,
        transport: input.transport,
        passportPath: input.passportPath,
        selfiePath: input.selfiePath,
        acceptedRulesAt: input.acceptedRulesAt,
        status: "pending",
        createdAt: new Date(),
        reviewedAt: null,
        reviewerId: null,
      })
      .where(eq(courierApplications.userId, userId));
  } else {
    await db.insert(courierApplications).values({
      userId,
      name: input.name,
      phone: input.phone,
      district: input.district,
      transport: input.transport,
      passportPath: input.passportPath,
      selfiePath: input.selfiePath,
      acceptedRulesAt: input.acceptedRulesAt,
      status: "pending",
    });
  }
  const owners = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${OWNER_EMAIL}`, isNull(users.deletedAt)))
    .limit(1);
  const owner = owners[0];
  if (owner && owner.id !== userId) {
    await bindNoticePushes(() =>
      saveNotice(db, {
        userId: owner.id,
        type: "courier",
        textKey: "notifCourierApply",
        params: { name: input.name, title: input.name },
        actorId: userId,
      }),
    );
  }
  return { ok: true, previous };
}

export async function removeCourierApplication(userId: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(courierApplications).where(eq(courierApplications.userId, userId)).limit(1);
  if (rows[0]) {
    await removePrivate(rows[0].passportPath);
    await removePrivate(rows[0].selfiePath);
    await db.delete(courierApplications).where(eq(courierApplications.userId, userId));
  }
  await releaseAssignedOrders(userId);
}

export type CourierAdminRow = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  district: string;
  transport: string;
  status: string;
  city: string | null;
  placeDistrict: string | null;
  email: string;
  createdAt: string;
};

export async function listCourierApplications(): Promise<CourierAdminRow[]> {
  const rows = await getDb()
    .select({
      id: courierApplications.id,
      userId: courierApplications.userId,
      name: courierApplications.name,
      phone: courierApplications.phone,
      district: courierApplications.district,
      transport: courierApplications.transport,
      status: courierApplications.status,
      city: users.courierCity,
      placeDistrict: users.courierDistrict,
      email: users.email,
      createdAt: courierApplications.createdAt,
    })
    .from(courierApplications)
    .innerJoin(users, eq(courierApplications.userId, users.id))
    .where(isNull(users.deletedAt))
    .orderBy(desc(courierApplications.createdAt))
    .limit(200);
  return rows.map((row) => ({ ...row, email: row.email ?? "", createdAt: row.createdAt.toISOString() }));
}

export async function reviewCourier(adminId: string, applicationId: string, approve: boolean): Promise<{ ok: true } | Fail> {
  if (!isDbUserId(applicationId)) return { error: "not-found", status: 404 };
  return bindNoticePushes(() =>
    getDb().transaction(async (tx) => {
      const rows = await tx.select().from(courierApplications).where(eq(courierApplications.id, applicationId)).limit(1);
      const app = rows[0];
      if (!app) return { error: "not-found", status: 404 };
      if (approve) {
        if (app.status === "approved") return { ok: true as const };
        await tx
          .update(courierApplications)
          .set({ status: "approved", reviewedAt: new Date(), reviewerId: adminId })
          .where(eq(courierApplications.id, app.id));
        await tx.update(users).set({ isCourier: true, updatedAt: new Date() }).where(eq(users.id, app.userId));
        console.info("[audit] courier", JSON.stringify({ at: new Date().toISOString(), admin: adminId, user: app.userId, on: true }));
        if (app.userId !== adminId) {
          await saveNotice(tx, { userId: app.userId, type: "courier", textKey: "notifCourierOn", params: {}, actorId: null });
        }
        return { ok: true as const };
      }
      if (app.status === "revoked") return { ok: true as const };
      const busy = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.courierId, app.userId), inArray(orders.status, ["assigned", "picked_up"])))
        .limit(1);
      if (busy[0]) return { error: "active", status: 409 };
      await tx
        .update(courierApplications)
        .set({ status: "revoked", reviewedAt: new Date(), reviewerId: adminId })
        .where(eq(courierApplications.id, app.id));
      await tx.update(users).set({ isCourier: false, courierOnline: false, updatedAt: new Date() }).where(eq(users.id, app.userId));
      console.info("[audit] courier", JSON.stringify({ at: new Date().toISOString(), admin: adminId, user: app.userId, on: false }));
      if (app.userId !== adminId) {
        await saveNotice(tx, { userId: app.userId, type: "courier", textKey: "notifCourierOff", params: {}, actorId: null });
      }
      return { ok: true as const };
    }),
  );
}

/** Working city and district. Does not touch the application, the badge, or past orders. */
export async function setCourierPlace(
  userId: string,
  city: string,
  district: string,
): Promise<{ ok: true; city: string; district: string } | Fail> {
  const nextCity = city.trim();
  const nextDistrict = district.trim();
  if (!isDeliveryCity(nextCity)) return { error: "bad-city", status: 400 };
  if (nextDistrict && !districtInCity(nextDistrict, nextCity)) return { error: "bad-district", status: 400 };
  const db = getDb();
  const who = await db.select({ courier: users.isCourier }).from(users).where(eq(users.id, userId)).limit(1);
  if (!who[0]?.courier) return { error: "forbidden", status: 403 };
  const active = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up", "refused"])))
    .limit(1);
  if (active[0]) return { error: "city-locked", status: 409 };
  await db
    .update(users)
    .set({ courierCity: nextCity, courierDistrict: nextDistrict || null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { ok: true, city: nextCity, district: nextDistrict };
}

export async function setCourierOnline(userId: string, on: boolean): Promise<{ ok: true; online: boolean } | Fail> {
  const db = getDb();
  const who = await db
    .select({ courier: users.isCourier, soft: users.courierSoftBanned, until: users.courierPausedUntil })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!who[0]?.courier) return { error: "forbidden", status: 403 };
  if (on && (who[0].soft || (who[0].until && who[0].until.getTime() > Date.now()))) {
    return { error: who[0].soft ? "soft-ban" : "paused", status: 403 };
  }
  await db.update(users).set({ courierOnline: on, updatedAt: new Date() }).where(eq(users.id, userId));
  return { ok: true, online: on };
}

export type BlockedBuyer = { id: string; name: string; email: string; phone: string; refusals: number };

export async function listBlockedBuyers(): Promise<BlockedBuyer[]> {
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, refusals: users.refusalCount })
    .from(users)
    .where(and(eq(users.orderBlocked, true), isNull(users.deletedAt)))
    .orderBy(desc(users.updatedAt))
    .limit(200);
  return rows.map((row) => ({ id: row.id, name: row.name, email: row.email ?? "", phone: row.phone ?? "", refusals: row.refusals }));
}

export async function unblockBuyer(adminId: string, userId: string): Promise<{ ok: true } | Fail> {
  if (!isDbUserId(userId)) return { error: "not-found", status: 404 };
  const db = getDb();
  const rows = await db
    .update(users)
    .set({ orderBlocked: false, refusalCount: 0, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning({ id: users.id });
  if (!rows[0]) return { error: "not-found", status: 404 };
  console.info("[audit] order-unblock", JSON.stringify({ at: new Date().toISOString(), admin: adminId, user: userId }));
  return { ok: true };
}

export async function courierPhotoPath(applicationId: string, kind: "passport" | "selfie"): Promise<string | null> {
  if (!isDbUserId(applicationId)) return null;
  const rows = await getDb().select().from(courierApplications).where(eq(courierApplications.id, applicationId)).limit(1);
  if (!rows[0]) return null;
  return kind === "passport" ? rows[0].passportPath : rows[0].selfiePath;
}
