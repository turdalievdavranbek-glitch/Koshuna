import { NextResponse } from "next/server";
import { photoMaxBytes, sniffImage } from "@/server/courier-files";
import { openDispute } from "@/server/delivery-disputes";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad-form" }, 400);
  }
  const text = String(form.get("text") ?? "");
  const file = form.get("photo");
  let photo: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > photoMaxBytes()) return json({ error: "bad-photo" }, 400);
    photo = Buffer.from(await file.arrayBuffer());
    if (!sniffImage(photo)) return json({ error: "bad-photo" }, 400);
  }
  const done = await openDispute(user.id, id, text, photo);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true, status: done.status });
}
