import { NextResponse } from "next/server";
import { ensureCourierThumb } from "@/server/courier-image";
import { readPrivatePhoto } from "@/server/courier-files";
import { canReviewCouriers, courierPhotoPath } from "@/server/couriers";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await canReviewCouriers(user.id))) return json({ error: "forbidden" }, 403);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "passport" && kind !== "selfie") return json({ error: "bad-photo" }, 400);
  const fullSize = url.searchParams.get("size") === "full";
  const { id } = await ctx.params;
  let rel = await courierPhotoPath(id, kind);
  if (!rel) return new Response("Not found", { status: 404 });
  let cache = "private, max-age=604800";
  if (!fullSize) {
    const thumb = await ensureCourierThumb(rel).catch(() => null);
    if (thumb) rel = thumb;
    else cache = "private, max-age=60";
  }
  const file = await readPrivatePhoto(rel);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "content-type": file.type,
      "content-length": String(file.bytes.byteLength),
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });
}
