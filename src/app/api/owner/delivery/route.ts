import { getSessionUser, sessionIsOwner } from "@/server/auth";
import { readPrivatePhoto } from "@/server/courier-files";
import { ownerDeliveryAct, ownerDeliveryDesk, ownerDisputePhoto } from "@/server/delivery-owner";
import { guardCsrf, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owner(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user || !(await sessionIsOwner(user.id))) return null;
    return user;
  } catch {
    return null;
  }
}

function missing() {
  return new Response(null, { status: 404 });
}

/** Owner only. Anyone else, including other admins, gets 404. */
export async function GET(req: Request) {
  if (!(await owner(req))) return missing();
  const photo = new URL(req.url).searchParams.get("photo");
  if (photo) {
    const rel = await ownerDisputePhoto(photo);
    if (!rel) return missing();
    const file = await readPrivatePhoto(rel);
    if (!file) return missing();
    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: { "content-type": file.type, "cache-control": "private, no-store" },
    });
  }
  return Response.json(await ownerDeliveryDesk(), { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return missing();
  if (!(await owner(req))) return missing();
  const body = await readJson<{ action?: unknown; id?: unknown }>(req);
  const action = typeof body?.action === "string" ? body.action : "";
  const id = typeof body?.id === "string" ? body.id : "";
  const done = await ownerDeliveryAct(action, id);
  if ("error" in done) return missing();
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
