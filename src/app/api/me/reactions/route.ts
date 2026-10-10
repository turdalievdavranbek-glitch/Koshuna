import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { reactions } from "@/server/db/schema";
import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const rows = await getDb().select().from(reactions).where(eq(reactions.userId, user.id));
  const map: Record<string, "like" | "dislike"> = {};
  for (const row of rows) {
    if (row.value === "like" || row.value === "dislike") map[row.listingId] = row.value;
  }
  return json({ reactions: map });
}
