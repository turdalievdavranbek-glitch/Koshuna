import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { media } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { removeFile } from "@/server/media";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drop the caller's uploads that no listing or shop uses (a deleted unpublished draft). */
export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ urls?: unknown }>(req);
  const raw = body && Array.isArray(body.urls) ? body.urls : [];
  const urls = Array.from(
    new Set(
      raw
        .filter((u): u is string => typeof u === "string" && u.length < 600)
        .map((u) => {
          try {
            return new URL(u, "https://x").pathname;
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    ),
  ).slice(0, 40);
  if (!urls.length) return json({ ok: true, removed: 0 });
  const db = getDb();
  const rows = await db
    .select()
    .from(media)
    .where(and(eq(media.ownerId, user.id), isNull(media.listingId), isNull(media.shopId), inArray(media.url, urls)));
  for (const row of rows) {
    if (row.path) await removeFile(row.path).catch(() => undefined);
  }
  if (rows.length) await db.delete(media).where(inArray(media.id, rows.map((row) => row.id)));
  return json({ ok: true, removed: rows.length });
}
