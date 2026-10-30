import { and, eq, ne, or } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { shops } from "@/server/db/schema";
import { json } from "@/server/http";
import { rowToShop } from "@/server/mappers";
import { shopsForViewer } from "@/server/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser(req).catch(() => null);
  const db = getDb();
  const rows = user
    ? await db
        .select()
        .from(shops)
        .where(
          or(
            and(eq(shops.status, "active"), eq(shops.underReview, false)),
            and(eq(shops.ownerId, user.id), ne(shops.status, "hidden")),
          ),
        )
    : await db.select().from(shops).where(and(eq(shops.status, "active"), eq(shops.underReview, false)));
  const visible = await shopsForViewer(rows.map(rowToShop), user?.id ?? null);
  return json({ shops: visible });
}
