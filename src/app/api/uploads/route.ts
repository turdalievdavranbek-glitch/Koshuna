import { getDb } from "@/server/db";
import { media } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { CHUNK_SIZE, validateUploadStart } from "@/server/media";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { kind?: string; mime?: string; size?: number; durationSec?: number | null };

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const problem = validateUploadStart(body);
  if (problem) return json({ error: problem }, 400);
  const [row] = await getDb()
    .insert(media)
    .values({
      ownerId: user.id,
      kind: body.kind || "photo",
      mime: body.mime || "",
      size: Number(body.size) || 0,
      received: 0,
      durationSec: body.durationSec ?? null,
      uploadStatus: "uploading",
      path: "",
      url: "",
    })
    .returning({ id: media.id });
  return json({ uploadId: row.id, chunkSize: CHUNK_SIZE });
}
