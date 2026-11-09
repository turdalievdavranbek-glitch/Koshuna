import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { media } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";
import { durationLimit, finalRelative, mediaPrefix, movePart, normalizeVideo, partPath, probeDuration, removeFile } from "@/server/media";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// A long video can take minutes to convert; a retried «complete» (client or proxy timeout) must wait for the same job, not start a second one.
const running = new Map<string, Promise<Response>>();

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const key = `${user.id}:${id}`;
  const busy = running.get(key);
  if (busy) return (await busy).clone();
  const job = finish(user.id, id);
  running.set(key, job);
  try {
    return (await job).clone();
  } finally {
    running.delete(key);
  }
}

async function finish(ownerId: string, id: string): Promise<Response> {
  const db = getDb();
  const rows = await db.select().from(media).where(and(eq(media.id, id), eq(media.ownerId, ownerId))).limit(1);
  const row = rows[0];
  if (!row) return json({ error: "not-found" }, 404);
  if (row.uploadStatus === "ready" && row.url) return json({ mediaId: row.id, url: row.url });
  if (row.uploadStatus === "failed") return json({ error: "video-duration" }, 400);
  if (row.received !== row.size) return json({ error: "incomplete", received: row.received }, 409);

  let duration = row.durationSec;
  if (row.kind === "video" || row.kind === "voice") {
    const probed = await probeDuration(partPath(id), row.kind);
    const over = typeof probed === "number" && probed > durationLimit(row.kind) + 0.5;
    if (probed === "unknown" || over) {
      await removeFile(partPath(id));
      await db.update(media).set({ uploadStatus: "failed" }).where(eq(media.id, id));
      return json({ error: "video-duration" }, 400);
    }
    if (probed !== "missing") duration = probed;
  }

  const final = finalRelative(row.kind, row.mime, row.id);
  let { relative, url } = final;
  let mime = row.mime;
  await movePart(id, relative);
  if (row.kind === "video") {
    // Phones only reliably play H.264/AAC mp4: re-encode WebM/HEVC, remux the rest.
    const normalized = await normalizeVideo(relative);
    if (normalized) {
      relative = normalized.relative;
      mime = normalized.mime;
      url = `${mediaPrefix()}/${relative}`;
    }
  }
  await db
    .update(media)
    .set({ uploadStatus: "ready", path: relative, url, mime, durationSec: duration })
    .where(eq(media.id, id));
  return json({ mediaId: row.id, url });
}
