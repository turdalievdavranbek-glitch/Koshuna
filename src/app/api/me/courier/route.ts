import { NextResponse } from "next/server";
import { isCourierTransport } from "@/lib/delivery";
import { normalizePhoneInput } from "@/lib/phone";
import { photoMaxBytes, removePrivate, sniffImage, writePrivatePhoto } from "@/server/courier-files";
import { myCourier, saveCourierApplication } from "@/server/couriers";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json(await myCourier(user.id), 200, { "Cache-Control": "no-store" });
}

async function storePhoto(userId: string, file: File): Promise<string> {
  if (file.size <= 0 || file.size > photoMaxBytes()) throw new Error("size");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) throw new Error("type");
  return writePrivatePhoto(userId, bytes, ext);
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad-form" }, 400);
  }
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizePhoneInput(String(form.get("phone") ?? ""));
  const district = String(form.get("district") ?? "").trim();
  const transport = String(form.get("transport") ?? "");
  if (name.length < 2 || name.length > 80) return json({ error: "bad-name" }, 400);
  if (!phone) return json({ error: "bad-phone" }, 400);
  if (district.length < 2 || district.length > 80) return json({ error: "bad-district" }, 400);
  if (!isCourierTransport(transport)) return json({ error: "bad-transport" }, 400);
  const passport = form.get("passport");
  const selfie = form.get("selfie");
  if (!(passport instanceof File) || !(selfie instanceof File)) return json({ error: "bad-photo" }, 400);
  const saved: string[] = [];
  try {
    const passportPath = await storePhoto(user.id, passport);
    saved.push(passportPath);
    const selfiePath = await storePhoto(user.id, selfie);
    saved.push(selfiePath);
    const done = await saveCourierApplication(user.id, {
      name,
      phone,
      district,
      transport,
      passportPath,
      selfiePath,
    });
    if ("error" in done) {
      await Promise.all(saved.map((rel) => removePrivate(rel)));
      return json({ error: done.error }, done.status);
    }
    await Promise.all(done.previous.map((rel) => removePrivate(rel)));
    return json({ ok: true });
  } catch {
    await Promise.all(saved.map((rel) => removePrivate(rel)));
    return json({ error: "bad-photo" }, 400);
  }
}
