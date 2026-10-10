import { eq } from "drizzle-orm";
import { sessionIsAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { listings, shops } from "@/server/db/schema";
import { hideShopForUser } from "@/server/shops";
import { banAuthor, hideListingById, keepTarget, moderationQueue } from "@/server/moderation";
import { commentAuthor, hideCommentById, keepComment } from "@/server/comments";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { action?: string; kind?: string; id?: string };

async function adminUser(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const admin = await sessionIsAdmin(user.id);
  if (!admin) return json({ error: "forbidden" }, 403);
  return user;
}

export async function GET(req: Request) {
  const user = await adminUser(req);
  if (user instanceof NextResponse) return user;
  const items = await moderationQueue();
  return json({ items });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await adminUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  const action = body?.action;
  const kind = body?.kind;
  const id = typeof body?.id === "string" ? body.id : "";
  if ((action !== "delete" && action !== "keep" && action !== "ban") || (kind !== "listing" && kind !== "shop" && kind !== "comment") || !id) {
    return json({ error: "bad-json" }, 400);
  }
  if (kind === "comment") {
    if (action === "keep") {
      const saved = await keepComment(id);
      if ("error" in saved) return json({ error: saved.error }, saved.status);
      return json({ ok: true });
    }
    const authorId = await commentAuthor(id);
    if (!authorId) return json({ error: "not-found" }, 404);
    if (action === "ban") {
      const saved = await banAuthor(user.id, authorId);
      if ("error" in saved) return json({ error: saved.error }, saved.status);
    }
    await hideCommentById(id);
    return json({ ok: true });
  }
  if (action === "keep") {
    const saved = await keepTarget(kind, id);
    if ("error" in saved) return json({ error: saved.error }, saved.status);
    return json({ ok: true });
  }
  if (action === "delete") {
    if (kind === "listing") {
      const saved = await hideListingById(id);
      if ("error" in saved) return json({ error: saved.error }, saved.status);
      return json({ ok: true });
    }
    const saved = await hideShopForUser(user, id);
    if ("error" in saved) return json({ ok: false, error: saved.error }, saved.status);
    return json({ ok: true });
  }
  if (kind !== "listing" && kind !== "shop") return json({ error: "bad-json" }, 400);
  const ownerId = await ownerOf(kind, id);
  if (!ownerId) return json({ error: "not-found" }, 404);
  const saved = await banAuthor(user.id, ownerId);
  if ("error" in saved) return json({ error: saved.error }, saved.status);
  return json({ ok: true });
}

async function ownerOf(kind: "listing" | "shop", id: string): Promise<string | null> {
  const db = getDb();
  if (kind === "listing") {
    const rows = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, id)).limit(1);
    return rows[0]?.ownerId ?? null;
  }
  const rows = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, id)).limit(1);
  return rows[0]?.ownerId ?? null;
}
