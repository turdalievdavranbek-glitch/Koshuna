import { and, eq, ne, or } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { shops } from "@/server/db/schema";
import { json } from "@/server/http";
import { rowToShop } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser(req).catch(() => null);
  const db = getDb();
  const rows = user
    ? await db
        .select()
        .from(shops)
        .where(or(eq(shops.status, "active"), and(eq(shops.ownerId, user.id), ne(shops.status, "hidden"))))
    : await db.select().from(shops).where(eq(shops.status, "active"));
  return json({ shops: rows.map(rowToShop) });
}
