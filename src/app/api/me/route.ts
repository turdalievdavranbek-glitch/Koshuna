import { eq } from "drizzle-orm";
import { normalizePhoneInput } from "@/lib/phone";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { publicUser } from "@/server/mappers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Patch = { name?: string; phone?: string; lang?: string; city?: string; district?: string };

function bad(field: string) {
  return json({ error: field }, 400);
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json({ user: publicUser(user) });
}

export async function PATCH(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Patch>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (body.name != null) {
    if (typeof body.name !== "string") return bad("name");
    const name = body.name.trim();
    if (name.length < 1 || name.length > 80) return bad("name");
    patch.name = name;
  }
  if (body.phone != null) {
    if (typeof body.phone !== "string") return bad("phone");
    if (!body.phone.trim()) {
      patch.phone = null;
    } else {
      const phone = normalizePhoneInput(body.phone);
      if (!phone) return bad("phone");
      patch.phone = phone;
    }
  }
  if (body.lang != null) {
    if (body.lang !== "ru" && body.lang !== "ky") return bad("lang");
    patch.lang = body.lang;
  }
  if (body.city != null) {
    if (typeof body.city !== "string" || body.city.trim().length > 64) return bad("city");
    patch.city = body.city.trim() || null;
  }
  if (body.district != null) {
    if (typeof body.district !== "string" || body.district.trim().length > 80) return bad("district");
    patch.district = body.district.trim() || null;
  }
  const db = getDb();
  const [row] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return json({
    user: publicUser({
      ...user,
      name: row.name,
      phone: row.phone,
      email: row.email,
      lang: row.lang,
      city: row.city,
      district: row.district,
    }),
  });
}
