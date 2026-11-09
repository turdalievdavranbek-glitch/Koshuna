import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { listingViews, listings } from "./db/schema";

const DEVICE = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Counts a view at most once per viewer per listing per day (UTC day). The owner is never counted.
 * Viewer: the signed-in user, otherwise an anonymous device id from the app.
 */
export async function recordView(
  listingId: string,
  viewer: { userId: string | null; device: unknown },
): Promise<{ counted: boolean; views: number } | { error: string; status: number }> {
  const db = getDb();
  const rows = await db
    .select({ ownerId: listings.ownerId, status: listings.status, views: listings.views })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  const row = rows[0];
  if (!row || row.status === "hidden") return { error: "not-found", status: 404 };
  const views = Number(row.views) || 0;
  if (viewer.userId && viewer.userId === row.ownerId) return { counted: false, views };
  const key = viewer.userId ? `u:${viewer.userId}` : typeof viewer.device === "string" && DEVICE.test(viewer.device) ? `d:${viewer.device}` : null;
  if (!key) return { counted: false, views };
  const inserted = await db
    .insert(listingViews)
    .values({ listingId, viewerKey: key, day: sql`current_date` })
    .onConflictDoNothing()
    .returning({ listingId: listingViews.listingId });
  if (!inserted.length) return { counted: false, views };
  // updatedAt stays: a view is not an edit.
  const next = await db
    .update(listings)
    .set({ views: sql`${listings.views} + 1` })
    .where(eq(listings.id, listingId))
    .returning({ views: listings.views });
  return { counted: true, views: Number(next[0]?.views) || views + 1 };
}
