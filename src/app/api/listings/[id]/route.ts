import { eq } from "drizzle-orm";
import { sessionIsAdmin, getSessionUser } from "@/server/auth";
import { listingCategoryError } from "@/lib/listing-rules";
import { sanitizeServiceListing } from "@/lib/service-listing";
import type { Listing } from "@/lib/types";
import { getDb } from "@/server/db";
import { listings, shops } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { attachMedia } from "@/server/media";
import { hideListingById, insertPersonalListing } from "@/server/moderation";
import { isListingStatus, listingCounts, listingMediaUrls, listingToRow, mediaUrlError, rowToListing, rowToShop } from "@/server/mappers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Body = Partial<Listing> & { videoSec?: number };

const PUBLIC_STATUS = new Set(["active", "promoted", "reserved", "closed", "withdrawn"]);

function ttlDate(): Date {
  const days = Number(process.env.LISTING_TTL_DAYS || 30);
  const n = Number.isFinite(days) && days > 0 ? days : 30;
  return new Date(Date.now() + n * 86_400_000);
}

function pack(row: typeof listings.$inferSelect) {
  return { listing: rowToListing(row), counts: { [row.id]: listingCounts(row) } };
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const rows = await getDb().select().from(listings).where(eq(listings.id, id)).limit(1);
  const row = rows[0];
  if (!row) return json({ error: "not-found" }, 404);
  if (row.status === "hidden") return json({ error: "not-found" }, 404);
  const viewer = await getSessionUser(req).catch(() => null);
  if (row.underReview && viewer?.id !== row.ownerId) return json({ error: "not-found" }, 404);
  if (row.shopId) {
    const shopRows = await getDb()
      .select({ underReview: shops.underReview, status: shops.status, ownerId: shops.ownerId })
      .from(shops)
      .where(eq(shops.id, row.shopId))
      .limit(1);
    const shop = shopRows[0];
    if (shop && (shop.underReview || shop.status === "hidden") && viewer?.id !== row.ownerId && viewer?.id !== shop.ownerId) {
      return json({ error: "not-found" }, 404);
    }
  }
  if (!PUBLIC_STATUS.has(row.status)) {
    if (!viewer || viewer.id !== row.ownerId) return json({ error: "not-found" }, 404);
  }
  return json(pack(row));
}

async function save(req: Request, id: string, patch: Body | null, mode: "put" | "patch") {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!patch) return json({ error: "bad-json" }, 400);
  const db = getDb();
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (existing[0] && existing[0].ownerId !== user.id) return json({ error: "forbidden" }, 403);

  // A listing hidden by moderation cannot be revived or edited by its owner.
  if (existing[0]?.status === "hidden") return json({ error: "hidden" }, 403);
  const base = existing[0] ? rowToListing(existing[0]) : null;
  if (mode === "patch" && !base) return json({ error: "not-found" }, 404);
  // Hiding is moderation-only: an owner edit keeps the stored status instead.
  if (existing[0] && patch.status === "hidden") {
    patch = { ...patch, status: existing[0].status as Listing["status"] };
  }
  const merged = sanitizeServiceListing({ ...(base ?? {}), ...patch, id } as Listing);
  if (!merged.section || !merged.title) return json({ error: "bad-listing" }, 400);
  let shopKinds: readonly string[] | null = null;
  if (merged.shopId) {
    const shopRows = await db.select().from(shops).where(eq(shops.id, merged.shopId)).limit(1);
    const shopRow = shopRows[0];
    if (!shopRow || shopRow.ownerId !== user.id) return json({ error: "forbidden-shop" }, 403);
    shopKinds = rowToShop(shopRow).kinds ?? [];
  }
  const categoryError = listingCategoryError(merged, shopKinds);
  if (categoryError) return json({ error: categoryError }, 400);
  if (!existing[0] && !merged.shopId && !user.phone) return json({ error: "phone-required" }, 400);
  if (merged.status && !isListingStatus(merged.status)) return json({ error: "bad-status" }, 400);
  if (!merged.status) merged.status = "active";
  const urls = listingMediaUrls(merged);
  const mediaError = mediaUrlError(urls);
  if (mediaError) return json({ error: mediaError }, 400);
  const videoSec = typeof patch.videoSec === "number" ? patch.videoSec : undefined;
  const row = listingToRow(merged, user.id, videoSec != null ? { videoSec } : undefined);
  let saved: typeof listings.$inferSelect | undefined;
  if (!existing[0]) {
    const values = { ...row, expiresAt: ttlDate(), views: 0, likes: 0, dislikes: 0 };
    if (!merged.shopId) {
      const created = await insertPersonalListing(user.id, values);
      if ("error" in created) return json({ error: created.error }, 409);
      saved = created.row;
    } else {
      const inserted = await db.insert(listings).values(values).returning();
      saved = inserted[0];
    }
  } else {
    const updated = await db.update(listings).set(row).where(eq(listings.id, id)).returning();
    saved = updated[0];
  }
  if (!saved) return json({ error: "save" }, 500);
  await attachMedia(user.id, urls, { listingId: id });
  return json(pack(saved));
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readJson<Body>(req);
  return save(req, id, body, "put");
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readJson<Body>(req);
  return save(req, id, body, "patch");
}

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const db = getDb();
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const row = existing[0];
  if (!row) return json({ error: "not-found" }, 404);
  const admin = await sessionIsAdmin(user.id);
  if (row.ownerId !== user.id && !admin) return json({ error: "forbidden" }, 403);
  const saved = await hideListingById(id);
  if ("error" in saved) return json({ error: saved.error }, saved.status);
  return json({ ok: true });
}
